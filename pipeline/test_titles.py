from pipeline.refine import _title, _wiki_display_title


def demo() -> None:
    assert _wiki_display_title("The_Milkmaid_(Vermeer)") == "The Milkmaid"
    assert _wiki_display_title("De_Nachtwacht") == "De Nachtwacht"
    assert (
        _title(
            {"title_en": "Het melkmeisje"},
            {"enwiki_title": "The_Milkmaid_(Vermeer)"},
            "en",
        )
        == "The Milkmaid"
    )


if __name__ == "__main__":
    demo()
