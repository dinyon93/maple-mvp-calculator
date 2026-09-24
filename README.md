# 메이플 MVP작 계산기 · 로컬 실행판

## GitHub에 소스 올리고 Vercel에 계산기 공개하기

GitHub에 올릴 폴더는 이 `maple-mvp` 폴더입니다. 여기에 포함된 `.gitignore`가 `config.local.json`, `data/`, `node_modules/`를 Git 커밋에서 제외합니다. `config.local.example.json`은 예시 값만 들어 있으므로 올릴 수 있습니다. `.gitignore`는 Git 명령으로 파일을 추가할 때 적용되며, GitHub 웹페이지에서 직접 파일을 선택해 업로드하는 경우에는 직접 제외해야 합니다. 업로드 전에 `git status`에 비밀번호 파일이 없는지 확인하세요.

VS Code에서 `maple-mvp` 폴더를 열고 터미널에서 다음 명령을 순서대로 실행하세요. 먼저 GitHub에서 빈 저장소를 만들고 마지막 URL을 본인 저장소 주소로 바꿉니다.

```powershell
git init
git check-ignore -v config.local.json
git add .
git status --short
git commit -m "Initial version"
git branch -M main
git remote add origin https://github.com/USER/REPOSITORY.git
git push -u origin main
```

`git check-ignore`의 출력에 `config.local.json`이 보이면 제외 규칙이 적용된 것입니다. 이미 Git에 추가된 파일은 `.gitignore`만으로 제외되지 않으므로 `git ls-files config.local.json`으로도 확인하세요. 이 명령에 파일명이 나오면 `git rm --cached config.local.json`으로 Git 추적에서만 빼고 다시 커밋해야 합니다. 예전에 비밀번호를 원격 저장소에 올린 적이 있다면 비밀번호를 변경하고 Git 기록도 별도로 정리해야 합니다.

Vercel에서 GitHub 계정을 연결하고 방금 만든 저장소를 **Import**하세요. 프로젝트의 **Root Directory**는 `web`, **Framework Preset**은 `Other`, **Build Command**는 빈 값(Override 활성화), **Output Directory**는 기본값 `.`로 설정하고 **Deploy**를 누르세요. 이 구조에서 GitHub 저장소 최상위가 `maple-mvp` 폴더입니다. 상위 폴더까지 저장소로 만들었다면 Root Directory는 `maple-mvp/web`입니다.

`web/`은 공개용 계산기 화면입니다. `web/shared-prices.json`에 게시된 시세를 자동으로 읽고, 날짜별 그래프를 친구들과 공유합니다. 공개 사이트에서 직접 고친 값은 본인 브라우저에만 저장되고 친구들에게 공개되지 않습니다. **자동 로그인과 옥션 시세 갱신**은 `start-windows.bat`으로 실행하는 로컬 프로그램에서만 동작합니다. `config.local.json`을 Vercel 환경 변수나 GitHub에 올리지 마세요.

### 로컬 갱신 결과를 친구들에게 공개하기

이미 GitHub와 Vercel을 연결한 경우, 새 버전의 파일을 기존 VS Code 프로젝트 폴더에 **덮어쓴 뒤** `config.local.json`과 `data/`는 그대로 두세요. 압축을 풀어 만든 새 폴더에서 시작하면 GitHub 연결(`.git`)이 없어 게시할 수 없습니다. VS Code에서 기존 폴더를 연 뒤 다음 명령을 실행해 새 기능을 먼저 GitHub와 Vercel에 배포하세요.

```powershell
git check-ignore -v config.local.json
git ls-files config.local.json data
git add README.md app.js index.html package.json publish.js server.js tests/local.test.js web/app.js web/index.html web/trend.js web/shared-prices.json
git status --short
git commit -m "Share public price history"
git push origin main
```

`git ls-files config.local.json data`는 아무것도 출력하지 않아야 합니다. 이 폴더를 Vercel 프로젝트의 Root Directory `web`으로 배포했는지도 확인하세요. 이후 PC에서 `start-windows.bat` 실행 → **옥션 시세 갱신**을 누르면 여섯 품목의 조회 성공 가격과 입력한 메소마켓·디스코드 시세를 로컬 기록에 남긴 뒤 **오직 `web/shared-prices.json`만** Git으로 커밋하고 푸시합니다. Vercel 자동 배포가 끝나면 친구들이 페이지를 새로고침하여 새 시세와 날짜별 그래프를 볼 수 있습니다. 메소 시세만 바꿨거나 옥션가를 직접 고친 날에는 **현재 입력한 시세 온라인에 게시**를 누르세요. `시세 갱신`이 성공해도 `온라인 게시 실패`가 표시되면 PC 기록만 저장된 상태입니다. 메시지에 따라 Git 로그인을 확인하고 게시 버튼을 다시 누르면 됩니다. PC는 게시 후 꺼도 됩니다.

GitHub에는 공개 시세 값과 날짜만 저장됩니다. 친구들도 그 값과 기록을 볼 수 있으므로 공개를 원하지 않는 값은 게시하지 마세요. 계정 ID, 비밀번호, 캐릭터명, 다른 계산 설정은 게시 데이터에 들어가지 않습니다. `config.local.json`과 `data/`가 Git에 추가돼 있으면 프로그램이 게시를 막습니다. 이전에 비밀번호를 채팅에 입력했다면 해당 비밀번호를 변경하세요.

## Windows에서 시작

1. 압축파일을 풀고 `maple-mvp` 폴더를 VS Code에서 엽니다. `config.local.example.json`을 같은 폴더에 **`config.local.json`**으로 복사한 다음, 이 파일의 `id`, `password`, `character`를 본인 값으로 수정하세요. 값은 따옴표 안에 입력합니다. JSON에서는 비밀번호 속 따옴표는 `\"`, 역슬래시는 `\\`로 입력합니다.
2. 첫 메이플 화면에서 로그인 버튼이 자동으로 선택되지 않으면, 브라우저에서 `F12` → Elements에서 **넥슨 로그인 버튼을 나타내는 `<a>` 요소** 우클릭 → `Copy` → `Copy selector`로 CSS 선택자를 복사하고 `config.local.json`의 `loginEntrySelector` 값에 붙여넣으세요. 제공된 화면의 `<div class="gnbLogin"><a obj="P_GNB">넥슨 로그인</a></div>` 구조라면 `.gnbLogin a[obj='P_GNB']`처럼 짧게 적을 수도 있습니다. `Copy outerHTML`로 복사한 `<div ...>` 전체는 선택자가 아닙니다. 입력하지 않을 때는 빈 문자열 `""`로 두면 자동 탐색을 시도합니다.
3. 폴더 안의 `start-windows.bat`을 실행합니다. Node.js가 설치돼 있어야 합니다. 첫 실행에는 인터넷으로 Playwright 패키지를 설치합니다. 옥션 조회에는 PC에 설치된 Google Chrome이 필요합니다. 자동으로 열린 `http://127.0.0.1:8765/`에서 계산기를 사용하세요.
4. **옥션 시세 갱신**을 누르면 서버가 그 시점의 `config.local.json`을 읽고 새 Chrome 창에서 `넥슨 로그인` → `넥슨ID 로그인` → 처음 페이지로 복귀 → 집 아이콘을 통한 메이플 홈 → `메이플 옥션` 메뉴 순서를 시도합니다. 집 아이콘의 링크를 찾지 못하면 메이플 홈 주소로 이동합니다. 추가 인증, 사람 확인 또는 캐릭터 선택을 요청하면 열린 창에서 직접 완료해 주세요. 로그인 완료와 옥션 검색창을 각각 최대 2분 동안 기다립니다.
   화면 조회 중 오류가 나면 열린 Chrome 창을 20초 동안 유지합니다. 그동안 어느 페이지에서 멈췄는지 확인해 주세요. `...Selector에 적은 CSS 선택자` 오류는 해당 설정값의 형식 오류이므로 바로 표시됩니다.
5. 여섯 품목 중 읽은 가격만 입력칸에 반영합니다. 각 옥션 검색 시작 시점 사이를 **최소 5.5초**로 유지합니다. 실패한 품목은 메시지에 표시됩니다. 로그인과 옥션의 실제 화면 구조를 이 환경에서는 검증하지 못했으므로 첫 조회는 시험 단계입니다.

`start-windows.bat`은 실행 파일이며, 계정 정보를 적는 곳은 `config.local.json`입니다. 비밀번호는 이 로컬 파일에 **일반 텍스트**로 저장됩니다. 화면 입력칸과 브라우저 저장소에는 넣지 않고 서버도 `127.0.0.1`에서만 요청을 받습니다. `config.local.json`과 `data/`는 `.gitignore`에 포함해 일반적인 `git add`로는 GitHub에 올라가지 않습니다. 수동으로 폴더를 압축해 공유하거나 `git add -f`로 추가하면 노출될 수 있으니 이 파일은 본인 PC에만 보관하세요. 친구마다 자신의 `config.local.json`을 만들어야 합니다. 옥션에서 구매·판매 행동은 수행하지 않습니다. 넥슨 비밀번호나 OTP를 채팅에 보내지 마세요.

기존 버전을 사용 중이었다면 새 폴더로 옮길 때 기존 `data/trends.json`을 복사하면 날짜별 기록을 이어 쓸 수 있습니다. 기존 서버 창은 종료하고 새 폴더의 배치 파일을 실행하세요.

### 화면 단계별 CSS 선택자

`config.local.json`에 아래 항목을 추가할 수 있습니다. 값이 `""`면 기존 자동 탐색을 사용합니다. 브라우저의 Elements에서 원하는 요소를 우클릭해 `Copy → Copy selector`를 선택하세요. CSS 선택자는 `<a ...>`처럼 HTML 태그 전체를 복사한 값이 아닙니다. 선택자에 `"`가 필요하면 JSON에서 이스케이프해야 하므로, 예시처럼 속성 값에는 작은따옴표를 쓰는 편이 편합니다.

| 설정 이름 | 사용되는 화면 |
| --- | --- |
| `loginEntrySelector` | 첫 메이플 화면의 넥슨 로그인 버튼 |
| `loginMethodSelector` | 넥슨ID 로그인 방식 탭 |
| `loginIdSelector`, `loginPasswordSelector`, `loginSubmitSelector` | 로그인 화면의 ID·비밀번호·제출 버튼 |
| `homeSelector` | 로그인 복귀 화면의 집 아이콘 |
| `auctionMenuSelector` | 메이플 홈의 메이플 옥션 메뉴 |
| `auctionAccount` | 옥션 계정 목록에서 고를 계정 이름. 로그인 ID의 `@` 앞부분과 같으면 빈칸 가능 |
| `accountDropdownSelector` | 옥션 화면에서 현재 계정(이메일)이 보이는 첫 번째 드롭다운. 자동 탐색이 실패할 때만 입력 |
| `accountSelector`, `characterSelector` | 계정 목록에 나타난 항목과 캐릭터 카드의 CSS 선택자. 자동 탐색이 실패할 때만 입력 |
| `characterSelectionStage` | 선택 화면의 위치. 로그인 복귀 직후 `afterLogin`, 집 아이콘 뒤 `afterHome`, 옥션 진입 뒤 `afterAuction`(기본값) |
| `auctionSearchSelector` | 옥션의 아이템명 검색 입력칸 |

예를 들어 `"loginEntrySelector": ".gnbLogin a[obj='P_GNB']"`는 JSON으로 올바른 선택자 값입니다. 다른 선택자들은 실제 화면을 확인한 뒤 각각 넣으세요. 계정·캐릭터 선택이 옥션에 들어가기 전에 나타나면 `characterSelectionStage`를 해당 단계로 변경하세요. 자동화의 전체 순서는 `auction.js`의 `refreshAuctionPrices()`에 있습니다. 이 프로젝트에서는 `start-windows.bat`이 로컬 서버를 켜고, `server.js`가 설정을 읽어 `auction.js`를 호출합니다.
옥션 검색창이 바로 나타나면 이미 입장한 것으로 보고 계정·캐릭터 선택을 건너뜁니다. 선택 화면이 나타나면 현재 계정 이메일이 보이는 드롭다운을 열고 `auctionAccount` 이름의 항목을 선택한 뒤, `character` 이름의 캐릭터 카드가 로딩되면 클릭합니다. `auctionAccount`가 빈 문자열이면 로그인 ID의 `@` 앞부분을 계정 이름으로 사용합니다. 계정 이름이 다르면 `"auctionAccount": "옥션에_보이는_계정명"`으로 직접 입력하세요. `accountDropdownSelector`, `accountSelector`, `characterSelector`는 `""`로 비워 두면 자동 탐색합니다. 옛 설정에서 `accountSelector`에 영문 계정 이름만 적은 경우도 인식합니다. 선택자가 필요할 때는 `"accountSelector": "span:text-is('계정명')"` 같은 CSS 형식을 사용하세요. 캐릭터 화면의 `canvas`만 복사하지 말고 이름이 보이는 캐릭터 카드 요소를 선택하세요.
캐릭터 이름이 `<p>채히동</p>`로 표시된다면 `"characterSelector": "p:text-is('채히동')"`처럼 이름 `<p>`의 선택자만 적으세요. 프로그램이 이름을 담은 클릭 가능한 카드 요소를 찾아 카드 전체를 누릅니다. `<p class=...>`를 통째로 넣으면 JSON의 CSS 선택자 형식 오류가 납니다.

macOS/Linux에서는 `npm install` 후 `npm start`를 실행하고 표시되는 로컬 주소를 여세요. 직접 HTML 파일을 열어도 계산과 브라우저 내부 추세 기록은 사용할 수 있지만 `옥션 시세 갱신`은 비활성화됩니다.

## 계산기와 기록

- 기본 아이템은 위습의 원더베리, 메이플 로얄 스타일, 플래티넘 카르마의 가위, 심연의 서큘레이터입니다. 프라임 큐브와 프라임 에디셔널 큐브는 크레딧샵 가격이 각각 10,000/20,000 크레딧인 별도 경로입니다.
- 옥션 가격은 **개당 메소**로 입력합니다. 45개 묶음 매물에 표시된 개당 가격을 사용하세요. 한 번의 캐시샵 구매가 여러 개를 준다면 `캐시샵 한 번 구매 시 받는 개수`에 입력합니다.
- 메소마켓 시세는 **1억 메소당 메이플포인트**, 디스코드 시세는 **1억 메소당 원화**로 직접 입력합니다. 입력칸에서 값 수정을 마치고 다른 곳을 클릭하면 오늘 날짜의 기록으로 저장됩니다.
- `시세 trend` 탭에서 여섯 품목과 두 메소 시세 중 하나를 선택해 날짜별 그래프와 기록표를 봅니다. 같은 날짜에 다시 갱신하면 그 날짜의 가격만 덮어씁니다. 다른 항목의 가격과 과거 날짜는 유지합니다.
- 로컬 프로그램 기록은 `data/trends.json`에 저장됩니다. 백업하려면 이 파일을 복사하세요. HTML 파일만 열어서 사용한 기록은 브라우저 로컬 저장소에만 남습니다.
- 옥션 자동 조회가 실패해도 `auction-prices.example.json`을 복사해 실제 개당 가격으로 고친 뒤 `옥션 시세 파일 가져오기`를 선택할 수 있습니다. **예시 파일의 숫자는 실제 시세가 아닙니다.**

## 계산 기준

- 넥슨캐시 직접 구매 → 아이템 옥션 판매. 메이플포인트로 아이템을 산 것으로 계산하지 않습니다.
- 직접 구매 아이템은 한 번 구매할 때마다 `floor(캐시가 × 5%)` 크레딧 적립을 가정합니다. 실제 구매 확정 시점 및 예외 사항을 확인하세요. 선물·포인트 경로에는 적립하지 않습니다.
- 기존 크레딧 잔액의 매각 가치를 새 지출의 회수액으로 중복 계산하지 않습니다. 아이템 및 메소마켓 경로마다 **기본 경로 + 프라임 큐브**, **기본 경로 + 프라임 에디셔널 큐브**를 각각 손익 순위에 표시합니다. 디스코드 판매 메소 합계는 기존 크레딧으로 구매한 큐브까지 포함하며, 손익은 이번 지출로 늘어난 판매 가능 큐브만 반영합니다.
- 메소마켓 경로는 입력한 1억 메소당 포인트 시세를 사용하며, 선택 입력한 포인트 이벤트를 합산합니다. 캐시로 메이플포인트를 확보할 때 **해당 상품 결제가 크레딧 적립 대상**이라는 가정으로 5% 크레딧을 반영합니다. 실제 구매 상품과 적립 시점을 확인하세요.
- 계산 결과는 자체 스크롤 영역에서 확인할 수 있습니다. 페이지 전체 스크롤과 별개로 결과 패널 위에서 휠을 굴리면 순위를 내립니다.
- 옥션 판매 수수료 기본값은 3%입니다. 남은 캐시·크레딧, 판매 지연·기타 비용은 반영하지 않습니다.

넥슨 공식 웹 옥션 안내: https://maplestory.nexon.com/Guide/N23GameInformation/Articles/394
메이플크레딧 및 큐브 가격 공지: https://gi.maplestory.nexon.com/Update/813

웹 옥션 검색은 하루 100회 제한입니다. 현재 이 프로그램은 `시세 갱신`을 누를 때만 검색하며 예약 조회는 실행하지 않습니다. 비공식 개인 도구이므로 넥슨의 로그인·검색 화면이 변경되면 연결 코드를 수정해야 할 수 있습니다.
