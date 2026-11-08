from app.services.documentary_risk import FINDINGS, address_matches, normalize_address

def test_dataset_contains_exactly_the_eleven_reviewed_properties():
    assert len(FINDINGS) == 11
    assert len({normalize_address(item["address"]) for item in FINDINGS}) == 11

def test_address_matching_accepts_city_suffix_and_punctuation():
    assert address_matches("124 Albemarle Avenue, Ewing", "124 ALBEMARLE AVENUE")
    assert address_matches("11 TRENT STREET, CITY OF TRENTON", "11 Trent Street")

def test_address_matching_does_not_match_unrelated_property():
    assert not address_matches("114 Mercer Street", "14 Mercer Street")

def test_only_four_findings_receive_provisional_moderate():
    provisional = [item for item in FINDINGS if item["status"] == "provisional"]
    assert len(provisional) == 4
    assert all(item["flag"] == "yellow" for item in provisional)

def test_absence_of_evidence_never_becomes_clear_green():
    no_data = [item for item in FINDINGS if item["status"] == "insufficient_data"]
    assert len(no_data) == 5
    assert all(item["flag"] is None for item in no_data)

def test_review_required_properties_have_no_color():
    review = [item for item in FINDINGS if item["status"] == "needs_review"]
    assert len(review) == 2
    assert all(item["flag"] is None for item in review)

def test_4216_mortgage_amount_is_explicitly_not_a_verified_debt():
    finding = next(item for item in FINDINGS if item["address"] == "4216 NOTTINGHAM WAY")
    mortgage = next(item for item in finding["evidence"] if item["type"] == "unverified_legacy_message")
    assert "excluido" in mortgage["note"].lower()
