"""
Typed Pydantic Domain Models for Genshin Abyss Studio.
Defines stable data contracts for video recordings, segments, music assignments, and project persistence.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class Segment(BaseModel):
    """Represents an individual video segment (e.g. Chamber 1 First Half)."""
    model_config = ConfigDict(extra="allow")
    id: str = Field(..., description="Unique segment identifier, e.g. ch1_h1")
    chamber: str = Field(..., description="Chamber label, e.g. 12-1")
    half: Optional[int] = Field(None, description="1 for First Half, 2 for Second Half, None for Builds")
    start_s: float = Field(..., ge=0.0, description="Start timestamp within source clip in seconds")
    duration_s: float = Field(..., gt=0.0, description="Duration of the segment in seconds")
    label: str = Field(..., description="Display label, e.g. Chamber 1 (First Half)")


class RecordingAnalysis(BaseModel):
    """Result of OpenCV boundary detection on a raw screen recording."""
    model_config = ConfigDict(extra="allow")
    path_id: str = Field(..., description="Filename or unique identifier of the video clip")
    duration_s: float = Field(..., ge=0.0, description="Total video clip duration in seconds")
    width: int = Field(1920, description="Video frame width")
    height: int = Field(1080, description="Video frame height")
    entry_cut_s: float = Field(0.0, ge=0.0, description="Initial entry loading screen trim timestamp")
    intermission_start_s: Optional[float] = Field(None, description="Mid-chamber loading screen start timestamp")
    intermission_end_s: Optional[float] = Field(None, description="Mid-chamber loading screen end timestamp")
    tail_cut_s: Optional[float] = Field(None, description="Post-combat exit screen trim timestamp")
    confidence: float = Field(0.95, ge=0.0, le=1.0, description="Normalized detection confidence score")


class MusicAssignment(BaseModel):
    """A BGM track selected and trimmed for an Abyss segment or suite."""
    model_config = ConfigDict(extra="allow")
    slot: str = Field(..., description="Slot identifier, e.g. Chamber 1, Chamber 2, Chamber 3, Builds")
    track_id: str = Field(..., description="Unique track ID or SHA256 hash")
    track_title: str = Field(..., description="Human-readable track title")
    target_duration_s: float = Field(..., gt=0.0, description="Required duration matching video segment")
    in_point_s: float = Field(0.0, ge=0.0, description="Audio start offset in seconds")
    fade_out_s: float = Field(2.5, ge=0.0, description="Duration of fade out tail")
    score: float = Field(1.0, description="Recommendation fit score")


class ThumbnailSlotConfig(BaseModel):
    """Configuration for one half (Side 1 or Side 2) of the 1080p thumbnail canvas."""
    model_config = ConfigDict(extra="allow")
    character: str = Field("Mavuika", description="Active character name")
    element: str = Field("Pyro", description="Vision element")
    img_url: str = Field("", description="Active illustration or custom image URL")
    scale: float = Field(1.0, gt=0.1, le=5.0, description="Canvas zoom scale")
    offset_x: float = Field(0.0, description="Horizontal pixel offset")
    offset_y: float = Field(0.0, description="Vertical pixel offset")
    mirrored: bool = Field(False, description="Whether the character art is flipped horizontally")
    archetype: str = Field("OVERLOAD", description="Team archetype title")
    constellation: str = Field("C0", description="Constellation badge")
    teammates: List[str] = Field(default_factory=list, description="4-unit team roster names")


class AbyssProject(BaseModel):
    """Complete, self-contained Abyss production project schema (.abyss file)."""
    model_config = ConfigDict(extra="allow")
    version: int = Field(1, description="Schema version number")
    project_name: str = Field("Abyss_Floor_12_Run", description="Project title")
    patch: str = Field("7.0", description="Genshin Impact patch version")
    floor: int = Field(12, description="Abyss floor number")
    created_at: float = Field(..., description="Unix timestamp of project creation")
    side1: ThumbnailSlotConfig
    side2: ThumbnailSlotConfig
    thumbnail_extra: Dict[str, Any] = Field(default_factory=dict, description="Canvas theme, layout, and styling parameters")
    segments: List[Segment] = Field(default_factory=list)
    music_suite: List[MusicAssignment] = Field(default_factory=list)
    youtube_metadata: Dict[str, Any] = Field(default_factory=dict)
