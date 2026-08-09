"""Constantes et définitions des 9 sous-activités EBIOS RM pour le RACI."""


class ActiviteCode:
    A1_1 = "A1.1"  # Cadrage (RACI + temporalité + rencontres + ressources + critères DIC)
    A1_2 = "A1.2"  # Identification des VM (cotation DIC)
    A2_VALIDATION = "A2_VALIDATION"  # Validation des VM par le Client
    A2_BS = "A2_BS"  # Identification des biens supports
    A1_3 = "A1.3"  # Identification des ER (gravité G1-G5)
    A3_G45_DG = "A3_G45_DG"  # Validation des ER G4/G5 (PDF p. 67)
    A1_4 = "A1.4"  # Évaluation du socle
    A4_SOCLE = "A4_SOCLE"  # Validation du socle par le RSSI (en général le Client)
    A4_VERROUILLAGE = "A4_VERROUILLAGE"  # Verrouillage Atelier 1


ALL_ACTIVITES = [
    ActiviteCode.A1_1, ActiviteCode.A1_2, ActiviteCode.A2_VALIDATION, ActiviteCode.A2_BS,
    ActiviteCode.A1_3, ActiviteCode.A3_G45_DG,
    ActiviteCode.A1_4, ActiviteCode.A4_SOCLE, ActiviteCode.A4_VERROUILLAGE,
]


ACTIVITE_LABELS = {
    ActiviteCode.A1_1: "Cadrage de l'étude",
    ActiviteCode.A1_2: "Identification des VM",
    ActiviteCode.A2_VALIDATION: "Validation VM",
    ActiviteCode.A2_BS: "Identification des BS",
    ActiviteCode.A1_3: "Identification des ER",
    ActiviteCode.A3_G45_DG: "Validation G4/G5",
    ActiviteCode.A1_4: "Évaluation du socle",
    ActiviteCode.A4_SOCLE: "Validation socle",
    ActiviteCode.A4_VERROUILLAGE: "Verrouillage Atelier 1",
}


ACTIVITE_PDF_REFS = {
    ActiviteCode.A1_1: "PDF p. 55-56",
    ActiviteCode.A1_2: "PDF p. 57-58",
    ActiviteCode.A2_VALIDATION: "PDF p. 67",
    ActiviteCode.A2_BS: "Fiche méthode n°2",
    ActiviteCode.A1_3: "PDF p. 60-67",
    ActiviteCode.A3_G45_DG: "PDF p. 67 (DG)",
    ActiviteCode.A1_4: "PDF p. 68-73",
    ActiviteCode.A4_SOCLE: "PDF p. 70",
    ActiviteCode.A4_VERROUILLAGE: "PDF p. 47",
}


# Statuts de workflow (5 états)
class WorkflowStatut:
    NON_DEMARRE = "NON_DEMARRE"
    EN_COURS = "EN_COURS"
    A_VALIDER = "A_VALIDER"
    VALIDE = "VALIDE"
    TERMINE = "TERMINE"


# Transitions autorisées
WORKFLOW_TRANSITIONS = {
    WorkflowStatut.NON_DEMARRE: [WorkflowStatut.EN_COURS],
    WorkflowStatut.EN_COURS: [WorkflowStatut.A_VALIDER, WorkflowStatut.NON_DEMARRE],
    WorkflowStatut.A_VALIDER: [WorkflowStatut.VALIDE, WorkflowStatut.EN_COURS],
    WorkflowStatut.VALIDE: [WorkflowStatut.TERMINE],
    WorkflowStatut.TERMINE: [],  # État final
}


def can_transition(from_statut: str, to_statut: str) -> bool:
    """Vérifie si une transition de statut est autorisée."""
    allowed = WORKFLOW_TRANSITIONS.get(from_statut, [])
    return to_statut in allowed
