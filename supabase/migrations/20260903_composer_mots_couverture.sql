-- Les mots de couverture facultatifs de l'écran 3 (refonte /composer du 03/09/2026).
--
-- `sous_titre`     : imprimé sous le titre, première de couverture.
-- `mot_quatrieme`  : un mot pour la quatrième de couverture.
--
-- Les deux sont FACULTATIFS : null est leur état normal, et le questionnaire
-- ne les exige jamais (la règle des six champs de questionnaire.ts est
-- inchangée). Tant que cette migration n'est pas appliquée, la route
-- /api/atelier/numero retombe sur un insert sans ces colonnes (repli 42703)
-- et les garde dans le journal `evenements` (payload de `numero_cree`).

alter table numeros add column if not exists sous_titre text;
alter table numeros add column if not exists mot_quatrieme text;
