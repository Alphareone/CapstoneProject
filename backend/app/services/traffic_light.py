"""Motor de reglas del semáforo ClearBid NJ.

Una regla puede quedar pass, fail o unknown. Datos ausentes nunca cuentan
como una regla superada. Si no hay reglas activas o faltan datos necesarios,
el motor no asigna un color verde por defecto.
"""
import ast
from dataclasses import dataclass
from datetime import datetime, timezone
from types import SimpleNamespace
from typing import Any

ENGINE_VERSION = "2.5"
_ROOT_BLOCKS = {"financial", "legal", "physical"}
_SAFE_BUILTINS = {"len": len, "abs": abs, "min": min, "max": max, "round": round}


@dataclass
class EvaluatedRule:
    code: str
    status: str      # pass | fail | unknown
    severity: str    # info | warning | critical
    title: str | None
    message: str | None


def _to_namespace(d: dict[str, Any] | None) -> SimpleNamespace:
    return SimpleNamespace(**(d or {}))


def build_context(prop: Any) -> dict[str, Any]:
    """Construye el contexto desde ORM o diccionarios sin inventar valores."""
    def block(name: str) -> dict:
        obj = prop.get(name) if isinstance(prop, dict) else getattr(prop, name, None)
        if obj is None:
            return {}
        if isinstance(obj, dict):
            return obj
        return {k: v for k, v in vars(obj).items() if not k.startswith("_")}

    return {
        "financial": _to_namespace(block("financial")),
        "legal": _to_namespace(block("legal")),
        "physical": _to_namespace(block("physical")),
    }


def _attribute_path(node: ast.AST) -> list[str] | None:
    """Devuelve una ruta como ['legal', 'title_status'] para una expresión."""
    parts: list[str] = []
    current = node
    while isinstance(current, ast.Attribute):
        parts.append(current.attr)
        current = current.value
    if isinstance(current, ast.Name) and current.id in _ROOT_BLOCKS:
        return [current.id, *reversed(parts)]
    return None


def _has_missing_inputs(expr: str, ctx: dict[str, Any]) -> bool:
    """Detecta atributos referenciados que no existen o cuyo valor es None."""
    try:
        tree = ast.parse(expr, mode="eval")
    except SyntaxError:
        return True

    # Permite condiciones explícitas que comparan un campo con None.
    intentional_none_checks: set[int] = set()
    for node in ast.walk(tree):
        if (
            isinstance(node, ast.Compare)
            and any(isinstance(op, (ast.Is, ast.IsNot)) for op in node.ops)
            and any(isinstance(c, ast.Constant) and c.value is None for c in node.comparators)
        ):
            intentional_none_checks.add(id(node.left))

    for node in ast.walk(tree):
        if not isinstance(node, ast.Attribute):
            continue
        path = _attribute_path(node)
        if not path or id(node) in intentional_none_checks:
            continue
        value: Any = ctx
        try:
            for part in path:
                value = value.get(part) if isinstance(value, dict) else getattr(value, part)
        except (AttributeError, KeyError, TypeError):
            return True
        if value is None:
            return True
    return False


def _safe_eval(expr: str, ctx: dict[str, Any]) -> bool | None:
    """True/False si se pudo evaluar; None si faltan datos o falla la expresión."""
    try:
        if _has_missing_inputs(expr, ctx):
            return None
        return bool(eval(expr, {"__builtins__": _SAFE_BUILTINS}, ctx))  # noqa: S307
    except Exception:
        return None


def evaluate(prop: Any, rules: list[Any]) -> tuple[str | None, list[EvaluatedRule], str]:
    """Devuelve (flag, resultados, estado_de_evaluación).

    flag: red | yellow | green | None. None significa que no se puede afirmar
    que la propiedad esté revisada. estado: complete | incomplete | not_configured.
    """
    ctx = build_context(prop)
    active_rules = []
    for rule in rules:
        active = rule.get("active") if isinstance(rule, dict) else getattr(rule, "active", True)
        if active:
            active_rules.append(rule)

    if not active_rules:
        return None, [], "not_configured"

    results: list[EvaluatedRule] = []
    critical_fail = False
    critical_unknown = False
    warning_unknown = False
    unknown_found = False
    warning_fail = False

    for rule in active_rules:
        get = rule.get if isinstance(rule, dict) else lambda key, default=None: getattr(rule, key, default)
        code = get("code")
        severity = get("severity")
        condition = get("condition")
        title = get("title")
        message = get("message")

        triggered = _safe_eval(condition, ctx)
        if triggered is None:
            status = "unknown"
            unknown_found = True
            if severity == "critical":
                critical_unknown = True
            elif severity == "warning":
                warning_unknown = True
            result_message = "No evaluada: faltan datos necesarios para comprobar esta regla."
        elif triggered:
            status = "fail"
            result_message = message
            if severity == "critical":
                critical_fail = True
            elif severity == "warning":
                warning_fail = True
        else:
            status = "pass"
            result_message = message

        results.append(EvaluatedRule(
            code=code, status=status, severity=severity,
            title=title, message=result_message,
        ))

    # Un riesgo crítico confirmado siempre es HIGH. Si faltan datos de reglas
    # críticas no se puede descartar HIGH. Una advertencia confirmada puede
    # mostrarse como MODERATE aunque falten datos de otras reglas warning;
    # nunca se asigna LOW/CLEAR mientras quede alguna regla sin comprobar.
    if critical_fail:
        flag = "red"
    elif critical_unknown:
        flag = None
    elif warning_fail:
        flag = "yellow"
    elif warning_unknown:
        flag = None
    else:
        flag = "green"

    return flag, results, ("incomplete" if unknown_found else "complete")


def now_tz() -> datetime:
    return datetime.now(timezone.utc)
