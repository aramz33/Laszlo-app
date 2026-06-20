"""Hotspots des œuvres phares — seed authored à la main (Adam révise).

Coordonnées normalisées [0,1] sur l'image de l'œuvre. `narration_text` = substrat
ancré (faits connus) ; l'audio est généré live au runtime depuis ce texte
(audio_url = cache optionnel, non rempli par le pipeline).
"""

from __future__ import annotations

from ..models import Hotspot

_SEED: dict[str, list[dict]] = {
    "SK-C-5": [  # The Night Watch — Rembrandt
        {
            "x": 0.46, "y": 0.55,
            "title": "Le geste du capitaine",
            "aspect": "technique",
            "narration_text": (
                "La main tendue du capitaine Frans Banninck Cocq, en noir, donne "
                "l'ordre de mise en marche. Rembrandt projette son ombre sur le "
                "manteau du lieutenant — un détail qui crée la profondeur."
            ),
        },
        {
            "x": 0.34, "y": 0.46,
            "title": "La fillette-mascotte",
            "aspect": "symbolisme",
            "narration_text": (
                "La jeune fille lumineuse à l'arrière-plan est la mascotte de la "
                "compagnie. À sa ceinture pend une poule aux serres bien visibles : "
                "les serres (klauwen) évoquent le nom des arquebusiers (kloveniers)."
            ),
        },
        {
            "x": 0.58, "y": 0.50,
            "title": "Le lieutenant en jaune",
            "aspect": "histoire",
            "narration_text": (
                "Willem van Ruytenburch, vêtu de jaune clair, contraste avec le noir "
                "du capitaine. Le jaune symbolisait la victoire ; l'or de sa tenue "
                "capte la lumière au centre de la composition."
            ),
        },
        {
            "x": 0.20, "y": 0.30,
            "title": "L'usage de la lumière",
            "aspect": "technique",
            "narration_text": (
                "Rembrandt utilise un clair-obscur dramatique pour hiérarchiser le "
                "groupe : la lumière sélectionne quelques figures clés plutôt que "
                "d'éclairer tout le monde uniformément, brisant la tradition du "
                "portrait de groupe statique."
            ),
        },
    ],
    "SK-A-2344": [  # The Milkmaid — Vermeer
        {
            "x": 0.45, "y": 0.52,
            "title": "Le filet de lait",
            "aspect": "technique",
            "narration_text": (
                "Le mince filet de lait est le seul mouvement de la scène. Vermeer "
                "fige un instant suspendu ; tout le reste respire le calme et la "
                "concentration."
            ),
        },
        {
            "x": 0.30, "y": 0.62,
            "title": "Le pain et la nature morte",
            "aspect": "technique",
            "narration_text": (
                "Vermeer applique de petits empâtements lumineux — les points "
                "pointillés (pointillés de lumière) sur le pain et le panier — pour "
                "simuler la façon dont la lumière scintille sur les surfaces."
            ),
        },
        {
            "x": 0.15, "y": 0.28,
            "title": "La lumière de la fenêtre",
            "aspect": "symbolisme",
            "narration_text": (
                "La lumière douce vient d'une fenêtre à gauche, signature de Vermeer. "
                "Elle ennoblit une tâche domestique ordinaire et transforme une "
                "servante en sujet digne d'un tableau."
            ),
        },
        {
            "x": 0.62, "y": 0.85,
            "title": "Le chauffe-pieds",
            "aspect": "histoire",
            "narration_text": (
                "Au sol, un chauffe-pieds et des carreaux de Delft représentant Cupidon. "
                "Au 17e siècle, ces détails pouvaient suggérer une dimension amoureuse "
                "discrète sous la scène domestique."
            ),
        },
    ],
}


def get(object_number: str) -> list[Hotspot]:
    return [
        Hotspot(
            object_number=object_number,
            x=h["x"], y=h["y"],
            title=h["title"], aspect=h["aspect"],
            narration_text=h["narration_text"],
            ord=i,
        )
        for i, h in enumerate(_SEED.get(object_number, []))
    ]


def all_flagships() -> list[str]:
    return list(_SEED.keys())
