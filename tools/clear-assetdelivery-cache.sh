#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
project_root="$(cd -- "$script_dir/.." && pwd -P)"
legacy_cache=""
confirm=1
dry_run=0

while (($#)); do
  case "$1" in
    --root)
      if (($# < 2)); then
        echo "Usage: $0 [--root PROJECT_DIR] [--yes] [--dry-run]" >&2
        exit 2
      fi
      project_root="$(cd -- "$2" && pwd -P)"
      shift 2
      ;;
    --yes)
      confirm=0
      shift
      ;;
    --legacy-cache)
      if (($# < 2)); then
        echo "Usage: $0 [--root PROJECT_DIR] [--legacy-cache DIR] [--yes] [--dry-run]" >&2
        exit 2
      fi
      legacy_cache="$2"
      shift 2
      ;;
    --dry-run)
      dry_run=1
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [--root PROJECT_DIR] [--legacy-cache DIR] [--yes] [--dry-run]"
      echo "Clears Asset Delivery downloads under assetdelivery/ and the old content/cache/node/ cache."
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 2
      ;;
  esac
done

cache_dir="$project_root/assetdelivery"
if [[ -z "$legacy_cache" ]]; then
  legacy_cache="$project_root/content/cache/node"
fi
if [[ ! -d "$project_root" || "$project_root" == "/" ]]; then
  echo "Refusing unsafe project root: $project_root" >&2
  exit 2
fi
echo "Asset Delivery cache: $cache_dir"
echo "Legacy Asset Delivery cache: $legacy_cache"
shopt -s nullglob dotglob
removals=()
for directory in "$cache_dir" "$legacy_cache"; do
  if [[ -L "$directory" ]]; then
    echo "Refusing to follow a symlink: $directory" >&2
    exit 2
  fi
  if [[ "$directory" == "$legacy_cache" ]] && {
    [[ -L "$project_root/content" ]] || [[ -L "$project_root/content/cache" ]]
  }; then
    echo "Refusing to follow a symlink in the legacy cache path." >&2
    exit 2
  fi
  [[ -d "$directory" ]] || continue
  entries=("$directory"/*)
  for entry in "${entries[@]}"; do
    if [[ "$directory" == "$cache_dir" && -L "$entry" ]]; then
      echo "Refusing to follow a symlink: $entry" >&2
      exit 2
    fi
    if [[ "$directory" == "$cache_dir" && -d "$entry" ]]; then
      for item in "$entry"/*; do
        [[ "${item##*/}" == ".gitkeep" ]] && continue
        removals+=("$item")
      done
    else
      [[ "${entry##*/}" == ".gitkeep" ]] && continue
      removals+=("$entry")
    fi
  done
done
if ((${#removals[@]} == 0)); then
  echo "Cache is already empty."
  exit 0
fi
for item in "${removals[@]}"; do
  echo "  $item"
done

if ((dry_run)); then
  echo "Dry run: no files were removed."
  exit 0
fi
if ((confirm)); then
  read -r -p "Delete downloaded Asset Delivery cache files? [y/N] " answer
  case "$answer" in
    y|Y|yes|YES) ;;
    *) echo "Cancelled."; exit 0 ;;
  esac
fi

for item in "${removals[@]}"; do
  rm -rf -- "$item"
done
echo "Asset Delivery cache cleared."
