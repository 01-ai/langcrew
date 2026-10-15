import uuid

from langcrew.utils.message_utils import generate_session_id, generate_response_id


def test_generate_session_id_preserves_existing_format():
    session_id = generate_session_id()

    assert session_id.startswith("session_")
    assert len(session_id) == 24
    int(session_id.removeprefix("session_"), 16)


def test_generate_response_id_returns_uuid4_hex():
    first = uuid.UUID(generate_response_id())
    second = uuid.UUID(generate_response_id())

    assert first.version == 4
    assert first.variant == uuid.RFC_4122
    assert first != second
    assert len(generate_response_id()) == 32
