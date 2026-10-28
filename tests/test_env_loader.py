"""Loading Supabase settings from .env.local without extra dependencies."""

import os

import pytest

from detection_engine.config.env import load_env_files

KEYS = ("SUPABASE_URL", "SUPABASE_KEY", "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY", "GAMBLEWATCH_NO_ENV_FILE", "EXTRA_SETTING")


@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    """Start without these variables and restore the real ones afterwards."""
    for name in KEYS:
        monkeypatch.setenv(name, "placeholder")   # records the original value
        monkeypatch.delenv(name)                  # then removes it for the test


def test_frontend_names_are_aliased_for_python(tmp_path):
    (tmp_path / ".env.local").write_text(
        "# komentar\n"
        "NEXT_PUBLIC_SUPABASE_URL=https://abc.supabase.co\n"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-key\n", encoding="utf-8")
    load_env_files(tmp_path)
    assert os.environ["SUPABASE_URL"] == "https://abc.supabase.co"
    assert os.environ["SUPABASE_KEY"] == "anon-key"


def test_quotes_blank_values_and_junk_lines(tmp_path):
    (tmp_path / ".env.local").write_text(
        'EXTRA_SETTING="dalam kutip"\n'
        "NEXT_PUBLIC_SUPABASE_ANON_KEY=\n"      # belum diisi -> diabaikan
        "bukan baris pengaturan\n", encoding="utf-8")
    load_env_files(tmp_path)
    assert os.environ["EXTRA_SETTING"] == "dalam kutip"
    assert "SUPABASE_KEY" not in os.environ


def test_real_environment_wins_over_the_file(tmp_path, monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://dari-terminal.supabase.co")
    (tmp_path / ".env.local").write_text(
        "NEXT_PUBLIC_SUPABASE_URL=https://dari-file.supabase.co\n", encoding="utf-8")
    load_env_files(tmp_path)
    assert os.environ["SUPABASE_URL"] == "https://dari-terminal.supabase.co"


def test_env_local_takes_priority_over_env(tmp_path):
    (tmp_path / ".env.local").write_text("EXTRA_SETTING=lokal\n", encoding="utf-8")
    (tmp_path / ".env").write_text("EXTRA_SETTING=umum\n", encoding="utf-8")
    load_env_files(tmp_path)
    assert os.environ["EXTRA_SETTING"] == "lokal"


def test_kill_switch_disables_loading(tmp_path, monkeypatch):
    (tmp_path / ".env.local").write_text("EXTRA_SETTING=x\n", encoding="utf-8")
    monkeypatch.setenv("GAMBLEWATCH_NO_ENV_FILE", "1")
    load_env_files(tmp_path)
    assert "EXTRA_SETTING" not in os.environ


def test_missing_files_are_fine(tmp_path):
    load_env_files(tmp_path)   # tidak error
