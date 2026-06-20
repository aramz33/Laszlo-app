#!/usr/bin/env bash
# Real-conditions quality probe: runs the demo path against the DEPLOYED runtime and
# prints full outputs so you can judge whether the AI is good enough. Re-run after any
# prompt / model / notice change to compare. Reads creds from .env.
#
#   ./supabase/quality-probe.sh            # French
#   ./supabase/quality-probe.sh en         # English
#
# What to watch (= what's "nul"):
#   - Hotspot: does court/découverte read SHORT & simple, long/passionné LONG & rich?
#   - Ask: grounded & specific? The "payment" question is a HALLUCINATION BAIT — a good
#          guide should say it doesn't have that detail, not invent a number.
#   - Followups: genuinely relevant, not generic?
#   - Speak: open the audio_url — is the voice acceptable?
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
LANG_=${1:-fr}
URL=$(grep -E '^SUPABASE_URL=' .env | cut -d= -f2-)
ANON=$(grep -oE 'sb_publishable_[A-Za-z0-9_]+' .env | head -1)
EP="$URL/functions/v1"
AID=5bc0dc80-bb3d-40d9-825e-9260e1dff6dc           # The Night Watch (SK-C-5)
HID=e2d7f12c-82f7-4d58-9a4a-63da0d1f68ee           # hotspot: captain's gesture
gen(){ curl -s "$EP/generate" -H "Authorization: Bearer $ANON" -H 'Content-Type: application/json' -d "$1"; }
hr(){ printf '\n\033[1m== %s ==\033[0m\n' "$1"; }

hr "PERSONA (onboarding -> profile)"
gen "{\"mode\":\"persona\",\"lang\":\"$LANG_\",\"onboarding\":{\"allure\":\"court\",\"niveau\":\"decouverte\",\"interets\":[\"technique\"]}}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['persona_summary'])"

hr "HOTSPOT — court / découverte (expect: 1-2 short, simple)"
gen "{\"mode\":\"hotspot\",\"artwork_id\":\"$AID\",\"hotspot_ids\":[\"$HID\"],\"lang\":\"$LANG_\",\"profile\":{\"allure\":\"court\",\"niveau\":\"decouverte\"}}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['items'][0]['text'])"

hr "HOTSPOT — long / passionné (expect: 4-6, richer, jargon ok)"
gen "{\"mode\":\"hotspot\",\"artwork_id\":\"$AID\",\"hotspot_ids\":[\"$HID\"],\"lang\":\"$LANG_\",\"profile\":{\"allure\":\"long\",\"niveau\":\"passionne\"}}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['items'][0]['text'])"

for Q in "Pourquoi ce tableau s'appelle-t-il la Ronde de nuit ?" "Combien Rembrandt a-t-il ete paye pour ce tableau ?"; do
  hr "ASK — $Q"
  curl -s -N "$EP/generate" -H "Authorization: Bearer $ANON" -H 'Content-Type: application/json' \
    -d "{\"mode\":\"ask\",\"artwork_id\":\"$AID\",\"question\":\"$Q\",\"lang\":\"$LANG_\"}" \
    | grep '"type":"done"' | python3 -c "import sys,json;print(json.loads(sys.stdin.read().replace('data: ',''))['text'])"
done

hr "FOLLOWUPS"
gen "{\"mode\":\"followups\",\"artwork_id\":\"$AID\",\"lang\":\"$LANG_\"}" \
  | python3 -c "import sys,json;[print('-',q) for q in json.load(sys.stdin)['questions']]"

hr "SPEAK (open the URL to hear the voice)"
curl -s "$EP/speak" -H "Authorization: Bearer $ANON" -H 'Content-Type: application/json' \
  -d "{\"text\":\"Bonjour, je suis Laszlo, votre guide.\",\"lang\":\"$LANG_\",\"provider\":\"auto\"}"
echo
