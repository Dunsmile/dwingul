#!/bin/zsh
cd -- "${0:A:h}" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if curl -fsS --max-time 1 http://localhost:4173/ 2>/dev/null | /usr/bin/grep -q '뒹굴'; then
  open 'http://localhost:4173'
  exit 0
fi
if ! command -v node >/dev/null 2>&1; then
  print 'Node.js 24 이상을 설치한 뒤 다시 실행해주세요.'
  read '?Enter를 누르면 닫습니다. '
  exit 1
fi
(node -e 'setTimeout(()=>{},900)' && open 'http://localhost:4173') &
node server.mjs
read '?서버가 종료되었습니다. Enter를 누르면 닫습니다. '
