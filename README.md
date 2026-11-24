# 계절의 모닥불

한국 시간에 따라 바뀌는 3D 쉼터입니다. Three.js로 풍경과 소품을 그리며, 화면을 드래그하거나 방향키를 눌러 둘러볼 수 있습니다.

서버가 한국 시간 자정을 기준으로 봄(3~5월), 여름(6~8월), 가을(9~11월), 겨울(12~2월)을 정합니다. 열린 페이지도 계절이 바뀌면 다음 풍경으로 전환됩니다.

겨울에는 고구마를 60초, 마시멜로를 12초 구워 꺼냅니다. 익을수록 음식 표면이 바뀌고, 시간이 지나면 탑니다. 채팅 메시지는 같은 쉼터에 접속한 사람에게 보이며 약 1분 뒤 사라집니다.

## SQLite로 실행

Node.js 24에서 `npm ci`, `npm run dev`를 실행하고 http://localhost:3000 을 엽니다. 같은 Node.js 서버에 접속한 브라우저는 내장 SQLite의 채팅을 공유합니다. 메시지는 약 1분 후 사라지며, 서버를 재시작하면 메모리의 SQLite 데이터도 초기화됩니다. `npm run build`는 정적 파일을 `dist/`에 생성합니다.

운영 환경에서도 Node.js 24를 지원하는 호스팅에서 `npm start`로 실행할 수 있습니다. 채팅을 공유하려면 모든 접속자가 하나의 서버 인스턴스에 연결되어야 합니다.

## Vercel 배포

1. 기존 withER의 Firebase 프로젝트 또는 별도 Firebase 프로젝트에서 Realtime Database를 사용합니다.
2. Firebase 콘솔의 **Realtime Database**에서 데이터베이스 URL을 복사합니다. **프로젝트 설정 → 서비스 계정**에서 서버용 서비스 계정 키를 준비합니다.
3. Vercel **Settings → Environment Variables**의 **Production**에 아래 값을 설정하고 재배포합니다.
   - `FIREBASE_DATABASE_URL`: Realtime Database URL
   - `FIREBASE_SERVICE_ACCOUNT_JSON`: 서비스 계정 JSON 파일의 전체 내용. 서버 환경 변수로 보관합니다.
4. 브라우저에서 배포 사이트의 `/api/chat`을 열어 `messages` 배열이 반환되는지 확인합니다.

채팅 데이터는 `seasonCampfire/production/{계절}` 아래에 저장됩니다. Vercel Preview는 `seasonCampfire/preview`를 씁니다. 브라우저는 이 데이터베이스에 직접 연결하지 않습니다. withER과 DB를 공유하는 경우 기존 Firebase 규칙을 확인해 이 경로에 일반 클라이언트가 읽거나 쓸 수 없도록 설정하세요. Firebase 규칙에서 상위 경로에 부여한 권한은 하위 규칙으로 철회할 수 없으므로, 전체 DB를 공개한 프로젝트라면 기존 규칙을 수정하거나 별도 DB를 사용하세요.

`/api/season`이 현재 계절을 정하고 `/api/chat`이 같은 계절의 유효한 메시지만 반환합니다. 1분이 지난 기록은 해당 방에 다음 채팅 요청이 들어올 때 Firebase에서 정리됩니다.

## 관리자 미리보기

Vercel 프로젝트 환경 변수에 `ADMIN_PASSWORD`를 추가하고 재배포하세요. 배포 주소 뒤에 `/admin`을 붙인 뒤 브라우저 로그인 창에 아이디 `admin`과 설정한 비밀번호를 입력하면 됩니다. 상단에서 봄, 여름, 가을, 겨울을 선택하고 각 풍경과 음식 동작을 확인할 수 있습니다. 이 페이지의 선택은 미리보기 탭에만 적용됩니다.

로컬에서는 `ADMIN_PASSWORD`를 서버 환경 변수로 지정하고 `npm run dev`를 실행하면 `http://localhost:3000/admin`에서 확인할 수 있습니다.

음식을 익기 전에 꺼내면 그때까지 익은 정도가 표시됩니다. **이어서 굽기**를 누르면 남은 시간부터 굽습니다.
