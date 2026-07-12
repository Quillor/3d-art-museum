#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE_DIR="$ROOT/review/source_assets"
OUT_DIR="$ROOT/assets/materials/masters"
ASANTE_SOURCE="$OUT_DIR/plaster_earthen_asante_v1/source/albedo_1254.png"
SEAM_TOOL="$ROOT/tools/make_seamless_texture.py"
PYTHON_BIN="${PYTHON_BIN:-python3}"

extract_master() {
  local master_id="$1"
  local ambient_id="$2"
  local archive="$SOURCE_DIR/${ambient_id}_1K-JPG.zip"
  local tmp
  tmp="$(mktemp -d)"

  test -f "$archive"
  mkdir -p "$OUT_DIR/$master_id/desktop" "$OUT_DIR/$master_id/mobile"
  unzip -j -o "$archive" \
    "${ambient_id}_1K-JPG_Color.jpg" \
    "${ambient_id}_1K-JPG_NormalGL.jpg" \
    "${ambient_id}_1K-JPG_Roughness.jpg" \
    -d "$tmp" >/dev/null

  cp "$tmp/${ambient_id}_1K-JPG_Color.jpg" \
    "$OUT_DIR/$master_id/desktop/color.jpg"
  cp "$tmp/${ambient_id}_1K-JPG_NormalGL.jpg" \
    "$OUT_DIR/$master_id/desktop/normal_gl.jpg"
  cp "$tmp/${ambient_id}_1K-JPG_Roughness.jpg" \
    "$OUT_DIR/$master_id/desktop/roughness.jpg"

  sips -Z 512 "$tmp/${ambient_id}_1K-JPG_Color.jpg" \
    --out "$OUT_DIR/$master_id/mobile/color.jpg" >/dev/null
  sips -Z 512 "$tmp/${ambient_id}_1K-JPG_NormalGL.jpg" \
    --out "$OUT_DIR/$master_id/mobile/normal_gl.jpg" >/dev/null
  sips -Z 512 "$tmp/${ambient_id}_1K-JPG_Roughness.jpg" \
    --out "$OUT_DIR/$master_id/mobile/roughness.jpg" >/dev/null

  rm -rf "$tmp"
}

extract_master "stone_limestone_dressed_v1" "Tiles143"
extract_master "stone_sandstone_warm_v1" "Bricks084"
extract_master "rock_natural_grey_v1" "Rock051"
extract_master "earth_rocky_v1" "Ground068"
extract_master "masonry_stone_irregular_v1" "Bricks098"
extract_master "paving_stone_grey_v1" "PavingStones142"
extract_master "plaster_lime_v1" "Plaster001"
extract_master "earth_compacted_v1" "Ground103"
extract_master "timber_parquet_light_v1" "WoodFloor051"
extract_master "timber_parquet_dark_v1" "WoodFloor064"
extract_master "stone_marble_white_v1" "Marble021"
extract_master "masonry_fired_brick_v1" "Bricks071"
extract_master "fabric_woven_neutral_v1" "Fabric019"
extract_master "ceramic_glazed_blue_v1" "Tiles135B"
extract_master "terrazzo_white_v1" "Terrazzo013"
extract_master "paper_white_v1" "Paper001"
extract_master "tatami_yellow_v1" "Tatami001"

# The checked-in Asante/Traditions source is preserved verbatim. Color tiers
# receive a deterministic wrap/interior-seam correction. Physical response
# comes from Plaster001's authored PBR response; no channel is derived from color.
test -f "$ASANTE_SOURCE"
test -f "$SEAM_TOOL"
mkdir -p \
  "$OUT_DIR/plaster_earthen_asante_v1/desktop" \
  "$OUT_DIR/plaster_earthen_asante_v1/mobile"
"$PYTHON_BIN" "$SEAM_TOOL" "$ASANTE_SOURCE" \
  "$OUT_DIR/plaster_earthen_asante_v1/desktop/color.jpg" \
  --size 1024 --quality 92
"$PYTHON_BIN" "$SEAM_TOOL" "$ASANTE_SOURCE" \
  "$OUT_DIR/plaster_earthen_asante_v1/mobile/color.jpg" \
  --size 512 --quality 90
cp "$OUT_DIR/plaster_lime_v1/desktop/normal_gl.jpg" \
  "$OUT_DIR/plaster_earthen_asante_v1/desktop/normal_gl.jpg"
cp "$OUT_DIR/plaster_lime_v1/desktop/roughness.jpg" \
  "$OUT_DIR/plaster_earthen_asante_v1/desktop/roughness.jpg"
cp "$OUT_DIR/plaster_lime_v1/mobile/normal_gl.jpg" \
  "$OUT_DIR/plaster_earthen_asante_v1/mobile/normal_gl.jpg"
cp "$OUT_DIR/plaster_lime_v1/mobile/roughness.jpg" \
  "$OUT_DIR/plaster_earthen_asante_v1/mobile/roughness.jpg"

"$PYTHON_BIN" "$ROOT/tools/build_material_manifest.py"

echo "Built source-authored material masters in $OUT_DIR"
