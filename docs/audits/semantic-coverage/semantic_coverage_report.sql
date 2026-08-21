WITH coverage_by_family AS (
    SELECT 'Exemplos' AS family, 1108 AS published, 1070 AS generic_recovered, 0 AS supplemental_tables, 1070 AS source_backed, 66 AS affected_units
    UNION ALL SELECT 'Pegadinhas', 420, 378, 0, 378, 64
    UNION ALL SELECT 'Procedimentos', 291, 252, 0, 252, 66
    UNION ALL SELECT 'Contrastes', 181, 137, 6, 143, 59
    UNION ALL SELECT 'Regras', 127, 43, 1, 44, 43
)
SELECT *
FROM coverage_by_family
ORDER BY source_backed DESC;
