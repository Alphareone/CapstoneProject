-- Semáforo definitivo vs. antecedente documental provisional.
SELECT
    p.id,
    p.address,
    p.flag AS definitive_flag,
    pl.documentary_flag,
    pl.documentary_status,
    tl.evaluation_status,
    tl.engine_version,
    pf.opening_price,
    pf.total_liens,
    pf.total_liens_verified,
    pl.documentary_summary,
    pl.documentary_evidence::jsonb AS documentary_evidence,
    tl.generated_at
FROM properties p
LEFT JOIN property_legal pl ON pl.property_id = p.id
LEFT JOIN property_financials pf ON pf.property_id = p.id
LEFT JOIN traffic_light_results tl ON tl.property_id = p.id
WHERE p.archived = false
  AND (
      p.address ILIKE '%TRENT STREET%'
      OR p.address ILIKE '%MERCER STREET%'
      OR p.address ILIKE '%ALBEMARLE AVENUE%'
      OR p.address ILIKE '%HOLLOW BROOK ROAD%'
      OR p.address ILIKE '%MOUNT LUCAS ROAD%'
      OR p.address ILIKE '%PENNINGTON ROAD%'
      OR p.address ILIKE '%NOTTINGHAM WAY%'
      OR p.address ILIKE '%WILLIAM STREET%'
      OR p.address ILIKE '%LOUISE LANE%'
      OR p.address ILIKE '%LAMBERTVILLE HOPEWELL ROAD%'
      OR p.address ILIKE '%WEST STREET%'
  )
ORDER BY p.address;

-- Resumen de niveles visibles: el color definitivo tiene prioridad; si falta,
-- se muestra el color documental provisional.
SELECT
    COALESCE(p.flag, pl.documentary_flag) AS visible_flag,
    pl.documentary_status,
    COUNT(*) AS properties
FROM properties p
LEFT JOIN property_legal pl ON pl.property_id = p.id
WHERE p.archived = false
GROUP BY COALESCE(p.flag, pl.documentary_flag), pl.documentary_status
ORDER BY visible_flag NULLS LAST, pl.documentary_status;
