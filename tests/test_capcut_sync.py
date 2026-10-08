import os
import json
import pytest
from starlette.testclient import TestClient
from app import app
import execution.auto_edit_abyss as abyss_mod

client = TestClient(app)

def test_capcut_projects_list():
    response = client.get('/api/capcut/projects')
    assert response.status_code == 200
    data = response.json()
    assert data.get('status') == 'ok'
    assert 'projects' in data
    assert isinstance(data['projects'], list)
    if data['projects']:
        proj = data['projects'][0]
        assert 'name' in proj
        assert 'duration_sec' in proj
        assert 'duration_formatted' in proj
        assert 'segments_count' in proj

def test_capcut_project_chapters_nonexistent():
    response = client.get('/api/capcut/project-chapters?project_name=NonExistentProject_12345XYZ')
    assert response.status_code == 200
    data = response.json()
    assert data.get('status') == 'error'
    assert 'not found' in data.get('message', '').lower()

def test_capcut_project_chapters_traversal_sanitized():
    # Attempting traversal should not escape or crash
    response = client.get('/api/capcut/project-chapters?project_name=../../../../Windows/System32')
    assert response.status_code == 200
    data = response.json()
    assert data.get('status') == 'error'

def test_capcut_project_chapters_with_mock_draft(tmp_path, monkeypatch):
    # Create mock draft directory
    fake_projects_dir = tmp_path / 'Projects' / 'com.lveditor.draft'
    mock_project_dir = fake_projects_dir / 'TestMockAbyssRun'
    mock_project_dir.mkdir(parents=True)

    # 7-segment mock draft content (in microseconds)
    mock_content = {
        'duration': 500000000,
        'tracks': [
            {
                'type': 'video',
                'segments': [
                    {'target_timerange': {'start': 0, 'duration': 75000000}},        # 00:00 -> 01:15
                    {'target_timerange': {'start': 75000000, 'duration': 80000000}}, # 01:15 -> 02:35
                    {'target_timerange': {'start': 155000000, 'duration': 90000000}},# 02:35 -> 04:05
                    {'target_timerange': {'start': 245000000, 'duration': 70000000}},# 04:05 -> 05:15
                    {'target_timerange': {'start': 315000000, 'duration': 85000000}},# 05:15 -> 06:40
                    {'target_timerange': {'start': 400000000, 'duration': 65000000}},# 06:40 -> 07:45
                    {'target_timerange': {'start': 465000000, 'duration': 35000000}},# 07:45 -> 08:20
                ]
            }
        ]
    }
    with open(mock_project_dir / 'draft_content.json', 'w', encoding='utf-8') as f:
        json.dump(mock_content, f)

    monkeypatch.setattr(abyss_mod, 'get_capcut_drafts_dir', lambda: fake_projects_dir)

    # Test listing
    res_list = client.get('/api/capcut/projects')
    assert res_list.status_code == 200
    data_list = res_list.json()
    assert len(data_list['projects']) == 1
    assert data_list['projects'][0]['name'] == 'TestMockAbyssRun'
    assert data_list['projects'][0]['segments_count'] == 7

    # Test chapters parsing
    res_chap = client.get('/api/capcut/project-chapters?project_name=TestMockAbyssRun')
    assert res_chap.status_code == 200
    data_chap = res_chap.json()
    assert data_chap['status'] == 'ok'
    assert len(data_chap['segments']) == 7
    assert data_chap['segments'][0]['time'] == '00:00'
    assert data_chap['segments'][0]['chamber'] == '1-1'
    assert data_chap['segments'][1]['time'] == '01:15'
    assert data_chap['segments'][1]['chamber'] == '1-2'
    assert data_chap['segments'][6]['time'] == '07:45'
    assert data_chap['segments'][6]['chamber'] == 'builds'


def test_capcut_project_chapters_bgm_extraction(tmp_path, monkeypatch):
    """Verify BGM tracks and timestamps are extracted from draft_content.json."""
    fake_projects_dir = tmp_path / 'Projects' / 'com.lveditor.draft'
    mock_project_dir = fake_projects_dir / 'TestBgmDraftRun'
    mock_project_dir.mkdir(parents=True)

    mock_content = {
        'duration': 300000000,
        'materials': {
            'audios': [
                {
                    'id': 'AUDIO-MAT-1',
                    'name': '[NCS Release] Elektronomia - Sky High (320k).mp3',
                    'path': 'C:/Music/SkyHigh.mp3'
                },
                {
                    'id': 'AUDIO-MAT-2',
                    'name': 'Alan Walker - Fade.mp3',
                    'path': 'C:/Music/Fade.mp3'
                }
            ]
        },
        'tracks': [
            {
                'type': 'video',
                'segments': [
                    {'target_timerange': {'start': 0, 'duration': 150000000}},
                    {'target_timerange': {'start': 150000000, 'duration': 150000000}}
                ]
            },
            {
                'type': 'audio',
                'segments': [
                    {
                        'material_id': 'AUDIO-MAT-1',
                        'target_timerange': {'start': 0, 'duration': 120000000}
                    },
                    # Looped sub-segment of track 1
                    {
                        'material_id': 'AUDIO-MAT-1',
                        'target_timerange': {'start': 120000000, 'duration': 30000000}
                    },
                    # Track 2
                    {
                        'material_id': 'AUDIO-MAT-2',
                        'target_timerange': {'start': 150000000, 'duration': 150000000}
                    }
                ]
            }
        ]
    }
    with open(mock_project_dir / 'draft_content.json', 'w', encoding='utf-8') as f:
        json.dump(mock_content, f)

    monkeypatch.setattr(abyss_mod, 'get_capcut_drafts_dir', lambda: fake_projects_dir)

    res = client.get('/api/capcut/project-chapters?project_name=TestBgmDraftRun')
    assert res.status_code == 200
    data = res.json()
    assert data['status'] == 'ok'
    assert 'bgm_tracks' in data
    assert len(data['bgm_tracks']) == 2
    
    # Track 1 cleaned title and timestamp
    assert data['bgm_tracks'][0]['title'] == 'Elektronomia - Sky High'
    assert data['bgm_tracks'][0]['timestamp'] == '00:00'
    assert data['bgm_tracks'][0]['seconds'] == 0.0

    # Track 2 cleaned title and timestamp
    assert data['bgm_tracks'][1]['title'] == 'Alan Walker - Fade'
    assert data['bgm_tracks'][1]['timestamp'] == '02:30'
    assert data['bgm_tracks'][1]['seconds'] == 150.0


def test_capcut_project_chapters_zero_bgm(tmp_path, monkeypatch):
    """Verify that 0 audio tracks in draft returns empty bgm_tracks array without error."""
    fake_projects_dir = tmp_path / 'Projects' / 'com.lveditor.draft'
    mock_project_dir = fake_projects_dir / 'TestZeroBgmRun'
    mock_project_dir.mkdir(parents=True)

    mock_content = {
        'duration': 100000000,
        'materials': {'audios': []},
        'tracks': [
            {
                'type': 'video',
                'segments': [{'target_timerange': {'start': 0, 'duration': 100000000}}]
            }
        ]
    }
    with open(mock_project_dir / 'draft_content.json', 'w', encoding='utf-8') as f:
        json.dump(mock_content, f)

    monkeypatch.setattr(abyss_mod, 'get_capcut_drafts_dir', lambda: fake_projects_dir)

    res = client.get('/api/capcut/project-chapters?project_name=TestZeroBgmRun')
    assert res.status_code == 200
    data = res.json()
    assert data['status'] == 'ok'
    assert data['bgm_tracks'] == []
