from app.services.traffic_light import evaluate


def rule(code, severity, condition):
    return {
        "code": code, "severity": severity, "condition": condition,
        "title": code, "message": "mensaje", "active": True,
    }


def prop(**blocks):
    return {
        "financial": blocks.get("financial", {}),
        "legal": blocks.get("legal", {}),
        "physical": blocks.get("physical", {}),
    }


def test_no_active_rules_does_not_return_green():
    flag, results, state = evaluate(prop(), [])
    assert flag is None and results == [] and state == "not_configured"


def test_critical_irs_lien_returns_red():
    flag, results, state = evaluate(
        prop(legal={"surviving_irs_lien": 12000}),
        [rule("IRS_SURVIVING_LIEN", "critical", "legal.surviving_irs_lien > 0")],
    )
    assert (flag, state, results[0].status) == ("red", "complete", "fail")


def test_warning_total_liens_returns_yellow_even_when_amount_is_large():
    flag, results, state = evaluate(
        prop(financial={"total_liens": 260000}),
        [rule("TOTAL_LIENS_REVIEW", "warning", "financial.total_liens > 0")],
    )
    assert (flag, state, results[0].status) == ("yellow", "complete", "fail")


def test_confirmed_warning_can_be_yellow_when_only_other_warning_data_is_missing():
    flag, results, state = evaluate(
        prop(financial={"total_liens": 260000}, legal={
            "surviving_irs_lien": 0, "senior_liens": 0, "title_status": "clear_title",
            "bankruptcy_indicator": False,
            "open_permits_count": None,
        }),
        [
            rule("IRS", "critical", "legal.surviving_irs_lien > 0"),
            rule("SENIOR", "critical", "legal.senior_liens > 0"),
            rule("TITLE", "critical", "legal.title_status not in ['clean', 'clear', 'clear_title']"),
            rule("BANKRUPTCY", "critical", "legal.bankruptcy_indicator is True"),
            rule("LIENS", "warning", "financial.total_liens > 0"),
            rule("PERMITS", "warning", "legal.open_permits_count > 0"),
        ],
    )
    assert (flag, state) == ("yellow", "incomplete")
    assert [item.status for item in results][-2:] == ["fail", "unknown"]


def test_missing_critical_data_prevents_yellow_from_becoming_final():
    flag, results, state = evaluate(
        prop(financial={"total_liens": 260000}, legal={
            "surviving_irs_lien": None, "senior_liens": 0,
            "title_status": "clear_title", "bankruptcy_indicator": False,
        }),
        [
            rule("IRS", "critical", "legal.surviving_irs_lien > 0"),
            rule("SENIOR", "critical", "legal.senior_liens > 0"),
            rule("TITLE", "critical", "legal.title_status not in ['clean', 'clear', 'clear_title']"),
            rule("BANKRUPTCY", "critical", "legal.bankruptcy_indicator is True"),
            rule("LIENS", "warning", "financial.total_liens > 0"),
        ],
    )
    assert flag is None and state == "incomplete"
    assert [item.status for item in results][-1] == "fail"


def test_missing_risk_data_is_unknown_not_green():
    flag, results, state = evaluate(
        prop(legal={"surviving_irs_lien": None}),
        [rule("IRS_SURVIVING_LIEN", "critical", "legal.surviving_irs_lien > 0")],
    )
    assert flag is None and state == "incomplete" and results[0].status == "unknown"


def test_all_rules_clear_returns_green():
    flag, results, state = evaluate(
        prop(legal={"surviving_irs_lien": 0}),
        [rule("IRS_SURVIVING_LIEN", "critical", "legal.surviving_irs_lien > 0")],
    )
    assert (flag, state, results[0].status) == ("green", "complete", "pass")


def test_bankruptcy_indicator_returns_red():
    flag, results, state = evaluate(
        prop(legal={"bankruptcy_indicator": True}),
        [rule("BANKRUPTCY", "critical", "legal.bankruptcy_indicator is True")],
    )
    assert (flag, state) == ("red", "complete")


def test_open_permits_returns_yellow():
    flag, results, state = evaluate(
        prop(legal={"open_permits_count": 2}),
        [rule("OPEN_PERMITS", "warning", "legal.open_permits_count > 0")],
    )
    assert (flag, state) == ("yellow", "complete")


def test_multiple_defendants_returns_yellow():
    flag, results, state = evaluate(
        prop(legal={"defendant_count": 3}),
        [rule("MULTIPLE_DEFENDANTS", "warning", "legal.defendant_count > 1")],
    )
    assert (flag, state) == ("yellow", "complete")


def test_llc_ownership_returns_yellow():
    flag, results, state = evaluate(
        prop(legal={"ownership_type": "LLC"}),
        [rule("LLC", "warning", "legal.ownership_type.lower() == 'llc'")],
    )
    assert (flag, state) == ("yellow", "complete")


def test_active_mortgage_returns_yellow():
    flag, results, state = evaluate(
        prop(legal={"mortgage_active": True}),
        [rule("MORTGAGE_ACTIVE", "warning", "legal.mortgage_active is True")],
    )
    assert (flag, state) == ("yellow", "complete")



def test_confirmed_high_risk_remains_red_when_other_data_is_missing():
    flag, results, state = evaluate(
        prop(legal={"surviving_irs_lien": 12000, "bankruptcy_indicator": None}),
        [
            rule("IRS_SURVIVING_LIEN", "critical", "legal.surviving_irs_lien > 0"),
            rule("BANKRUPTCY", "critical", "legal.bankruptcy_indicator is True"),
        ],
    )
    assert flag == "red" and state == "incomplete"
    assert [item.status for item in results] == ["fail", "unknown"]



def test_large_total_liens_are_moderate_when_all_legal_checks_are_complete():
    legal = {
        "surviving_irs_lien": 0, "senior_liens": 0, "title_status": "clear_title",
        "bankruptcy_indicator": False, "open_permits_count": 0,
        "defendant_count": 1, "ownership_type": "individual",
        "mortgage_active": False, "occupancy": "vacant",
    }
    rules = [
        rule("IRS", "critical", "legal.surviving_irs_lien > 0"),
        rule("SENIOR", "critical", "legal.senior_liens > 0"),
        rule("TITLE", "critical", "legal.title_status not in ['clean', 'clear', 'clear_title']"),
        rule("BANKRUPTCY", "critical", "legal.bankruptcy_indicator is True"),
        rule("LIENS", "warning", "financial.total_liens > 0"),
        rule("PERMITS", "warning", "legal.open_permits_count > 0"),
        rule("DEFENDANTS", "warning", "legal.defendant_count > 1"),
        rule("LLC", "warning", "legal.ownership_type.lower() == 'llc'"),
        rule("MORTGAGE", "warning", "legal.mortgage_active is True"),
        rule("OCCUPANCY", "warning", "legal.occupancy == 'occupied'"),
    ]
    flag, results, state = evaluate(prop(financial={"total_liens": 260000}, legal=legal), rules)
    assert (flag, state) == ("yellow", "complete")
    assert all(item.status in {"pass", "fail"} for item in results)
    assert [item.code for item in results if item.status == "fail"] == ["LIENS"]


def test_zero_total_liens_without_verification_is_unknown():
    flag, results, state = evaluate(
        prop(financial={"total_liens": 0, "total_liens_verified": None}),
        [rule("TOTAL_LIENS_REVIEW", "warning", "financial.total_liens_verified is True and financial.total_liens > 0")],
    )
    assert flag is None and state == "incomplete" and results[0].status == "unknown"


def test_verified_zero_total_liens_passes():
    flag, results, state = evaluate(
        prop(financial={"total_liens": 0, "total_liens_verified": True}),
        [rule("TOTAL_LIENS_REVIEW", "warning", "financial.total_liens_verified is True and financial.total_liens > 0")],
    )
    assert flag == "green" and state == "complete" and results[0].status == "pass"


def test_verified_positive_total_liens_is_moderate():
    flag, results, state = evaluate(
        prop(financial={"total_liens": 260000, "total_liens_verified": True}),
        [rule("TOTAL_LIENS_REVIEW", "warning", "financial.total_liens_verified is True and financial.total_liens > 0")],
    )
    assert flag == "yellow" and state == "complete" and results[0].status == "fail"
