// Google OAuth 클라이언트 ID (Google Cloud Console에서 발급)
// https://console.cloud.google.com/ → API 및 서비스 → 사용자 인증 정보 → OAuth 2.0 클라이언트 ID
const GMAIL_CLIENT_ID = "YOUR_CLIENT_ID.apps.googleusercontent.com";

let gmailTokenClient = null;
let gmailAccessToken = null;
let pendingMailPayload = null;

function initGmailToken() {
  if (!window.google) return;
  gmailTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GMAIL_CLIENT_ID,
    scope: "https://www.googleapis.com/auth/gmail.send",
    callback: (response) => {
      if (response.error) {
        showToast("Google 인증에 실패했습니다.");
        return;
      }
      gmailAccessToken = response.access_token;
      if (pendingMailPayload) {
        const { to, subject, body } = pendingMailPayload;
        pendingMailPayload = null;
        sendViaGmailApi(to, subject, body);
      }
    },
  });
}

function buildMimeMessage(to, subject, body) {
  const lines = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    btoa(unescape(encodeURIComponent(body))),
  ];
  return btoa(lines.join("\r\n"))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sendViaGmailApi(to, subject, body) {
  const raw = buildMimeMessage(to, subject, body);
  try {
    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${gmailAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    });
    if (res.ok) {
      showToast("메일이 성공적으로 발송되었습니다!");
      closeModal("mail");
    } else {
      const err = await res.json();
      showToast(`발송 실패: ${err.error?.message ?? "알 수 없는 오류"}`);
    }
  } catch {
    showToast("네트워크 오류로 메일을 보내지 못했습니다.");
  }
}

function requestGmailSend(to, subject, body) {
  if (GMAIL_CLIENT_ID === "YOUR_CLIENT_ID.apps.googleusercontent.com") {
    showToast("GMAIL_CLIENT_ID를 설정해야 자동 발송이 가능합니다.");
    return false;
  }
  if (!gmailTokenClient) initGmailToken();
  pendingMailPayload = { to, subject, body };
  if (gmailAccessToken) {
    sendViaGmailApi(to, subject, body);
  } else {
    gmailTokenClient.requestAccessToken();
  }
  return true;
}

const typeLabels = {
  normal: "일반 파일",
  important: "중요 파일",
  critical: "최중요 파일",
};

const typeRules = {
  normal: "학생이 바로 수정 가능",
  important: "반 과반수 동의 필요",
  critical: "담임선생님 승인 필요",
};

const requestLabels = {
  "create-file": "파일 추가 요청",
  "edit-critical": "최중요 파일 수정 요청",
  "edit-important": "중요 파일 수정 동의",
};

const statusLabels = {
  pending: "대기 중",
  approved: "승인됨",
  rejected: "반려됨",
  open: "투표 진행 중",
};

const teacherAccount = {
  id: "teacher",
  role: "teacher",
  name: "한가람",
  nickname: "6반 담임 홍연화",
  username: "26-10600@ilgo.gen.hs.kr",
  legacyUsername: "tree-5193",
  password: "room-8264",
};

const colorHuntColors = [
  "#F9F7F7",
  "#DBE2EF",
  "#3F72AF",
  "#112D4E",
  "#F8EDE3",
  "#DFD3C3",
  "#D0B8A8",
  "#85586F",
  "#222831",
  "#393E46",
  "#00ADB5",
  "#EEEEEE",
  "#F38181",
  "#FCE38A",
  "#EAFFD0",
  "#95E1D3",
];

const state = {
  session: null,
  currentStudentId: 1,
  selectedFolderId: "all",
  selectedFileId: 1,
  nextRequestId: 5,
  nextFileId: 5,
  backgroundColor: "#f5f7fb",
  heroStartColor: "#18264c",
  heroEndColor: "#3157d5",
  previewStyle: {
    fontSize: 18,
    color: "#172033",
  },
  folders: [
    { id: "all", name: "전체 파일", description: "모든 폴더의 파일을 한 번에 봅니다." },
    { id: "notice", name: "공지와 규칙", description: "학급 공지, 운영 규칙, 필수 안내" },
    { id: "study", name: "수업과 평가", description: "수행평가, 시험, 공부 자료" },
    { id: "activity", name: "학급 활동", description: "동아리, 행사, 친구 추천 자료" },
  ],
  files: [
    {
      id: 1,
      folderId: "notice",
      title: "학급 공지 모음",
      type: "normal",
      content:
        "이번 주 공지\n- 수요일 7교시 학급회의\n- 금요일 체육대회 반 티셔츠 사이즈 조사\n- 청소 구역표는 매주 월요일 갱신",
      updatedBy: "김은호",
      updatedAt: "2026.05.14",
    },
    {
      id: 2,
      folderId: "study",
      title: "수행평가 일정표",
      type: "important",
      content:
        "과목별 수행평가 일정\n- 국어: 토론 활동지 제출\n- 영어: 발표 대본 초안 제출\n- 통합사회: 자료 조사 카드 정리\n\n일정 변경은 반 과반수 동의 후 반영합니다.",
      updatedBy: "박현민",
      updatedAt: "2026.05.12",
    },
    {
      id: 3,
      folderId: "notice",
      title: "학급 운영 규칙",
      type: "critical",
      content:
        "우리 반 운영 규칙\n1. 서로의 개인정보를 허락 없이 올리지 않습니다.\n2. 중요한 공지와 규칙은 담임선생님 확인 후 수정합니다.\n3. 근거 없는 소문이나 비방은 작성하지 않습니다.",
      updatedBy: "담임선생님",
      updatedAt: "2026.05.10",
    },
    {
      id: 4,
      folderId: "activity",
      title: "동아리 추천 자료",
      type: "normal",
      content:
        "친구들이 추천하는 동아리와 준비 팁을 모아두는 파일입니다.\n- 방송부: 면접 질문을 미리 정리하면 좋아요.\n- 과학탐구반: 실험 보고서를 꾸준히 쓰는 친구에게 추천합니다.",
      updatedBy: "이태윤",
      updatedAt: "2026.05.15",
    },
  ],
  students: [
    { id: 1, number: 1, name: "김은호", nickname: "7번 김은호", username: "26-10607@ilgo.gen.hs.kr", legacyUsername: "blue-2748", password: "wiki-2049", banned: false },
    { id: 2, number: 2, name: "이태윤", nickname: "20번 이태윤", username: "26-10620@ilgo.gen.hs.kr", legacyUsername: "wave-6031", password: "note-8615", banned: false },
    { id: 3, number: 3, name: "박현민", nickname: "10번 박현민", username: "26-10610@ilgo.gen.hs.kr", legacyUsername: "star-4829", password: "class-4472", banned: false },
    { id: 4, number: 4, name: "정민우", nickname: "21번 정민우", username: "26-10621@ilgo.gen.hs.kr", legacyUsername: "moon-7364", password: "read-1358", banned: true },
    { id: 5, number: 5, name: "정원우", nickname: "22번 정원우", username: "26-10622@ilgo.gen.hs.kr", legacyUsername: "fire-1582", password: "page-7193", banned: false },
    { id: 6, number: 6, name: "12번 학생", nickname: "12번 학생", username: "26-10612@ilgo.gen.hs.kr", legacyUsername: "leaf-3057", password: "jump-5824", banned: false },
  ],
  requests: [
    {
      id: 1,
      kind: "create-file",
      title: "급식 메뉴 후기",
      folderId: "activity",
      requesterId: 2,
      status: "pending",
      description: "점심 메뉴 후기와 추천 조합을 모아두는 파일을 만들고 싶어요.",
    },
    {
      id: 2,
      kind: "edit-critical",
      fileId: 3,
      requesterId: 1,
      status: "pending",
      description: "개인정보 예시 문구를 더 명확하게 바꾸는 수정 요청입니다.",
    },
    {
      id: 3,
      kind: "edit-important",
      fileId: 2,
      requesterId: 3,
      status: "open",
      votes: 13,
      requiredVotes: 15,
      description: "영어 발표 대본 제출일을 다음 주 월요일로 변경 요청합니다.",
    },
    {
      id: 4,
      kind: "create-file",
      title: "시험 공부 자료실",
      folderId: "study",
      requesterId: 4,
      status: "rejected",
      description: "활동금지 상태에서는 새 파일 요청이 제한된다는 예시입니다.",
    },
  ],
};

const elements = {
  sendMailButton: document.querySelector("#send-mail-button"),
  loginModal: document.querySelector("#login-modal"),
  mailModal: document.querySelector("#mail-modal"),
  mailForm: document.querySelector("#mail-form"),
  mailEmailInput: document.querySelector("#mail-email-input"),
  mailResult: document.querySelector("#mail-result"),
  currentRoleLabel: document.querySelector("#current-role-label"),
  currentRoleDescription: document.querySelector("#current-role-description"),
  loginStatus: document.querySelector("#login-status"),
  authPanelBody: document.querySelector("#auth-panel-body"),
  folderList: document.querySelector("#folder-list"),
  fileList: document.querySelector("#file-list"),
  fileDetail: document.querySelector("#file-detail"),
  requestList: document.querySelector("#request-list"),
  teacherPanel: document.querySelector("#teacher-panel"),
  teacherRequestList: document.querySelector("#teacher-request-list"),
  studentList: document.querySelector("#student-list"),
  backgroundPalette: document.querySelector("#background-palette"),
  newFileRequestButton: document.querySelector("#new-file-request-button"),
  studentWarning: document.querySelector("#student-warning"),
  toast: document.querySelector("#toast"),
};

function getCurrentStudent() {
  if (state.session?.role !== "student") return null;
  return state.students.find((student) => student.id === state.session.id) ?? null;
}

function getSelectedFile() {
  return state.files.find((file) => file.id === state.selectedFileId) ?? state.files[0];
}

function getVisibleFiles() {
  if (state.selectedFolderId === "all") return state.files;
  return state.files.filter((file) => file.folderId === state.selectedFolderId);
}

function getStudentName(studentId) {
  return state.students.find((student) => student.id === studentId)?.nickname ?? "알 수 없음";
}

function getFolderName(folderId) {
  return state.folders.find((folder) => folder.id === folderId)?.name ?? "미분류";
}

function getFileTitle(fileId) {
  return state.files.find((file) => file.id === fileId)?.title ?? "새 파일";
}

function isLoggedIn() {
  return Boolean(state.session);
}

function isTeacherLoggedIn() {
  return state.session?.role === "teacher";
}

function isStudentBlocked() {
  return state.session?.role === "student" && getCurrentStudent()?.banned;
}

function canStudentEdit() {
  return state.session?.role === "student" && !isStudentBlocked();
}

function getCurrentRole() {
  return state.session?.role ?? "visitor";
}

function getSessionNickname() {
  if (!state.session) return "방문자";
  return state.session.nickname;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.remove("hidden");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    elements.toast.classList.add("hidden");
  }, 2200);
}

function getLockedMarkup(extraClass = "") {
  return `
    <div class="locked-state ${extraClass}">
      <div class="locked-icon" aria-hidden="true">🔒</div>
      <strong class="locked-title">열람 불가</strong>
    </div>
  `;
}

function getLuminance(hexColor) {
  const hex = hexColor.replace("#", "");
  const rgb = [0, 2, 4].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
  const [red, green, blue] = rgb.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function getHeroTextColors() {
  const averageLuminance = (getLuminance(state.heroStartColor) + getLuminance(state.heroEndColor)) / 2;
  const isLightHero = averageLuminance > 0.55;

  return isLightHero
    ? {
        text: "#172033",
        muted: "rgba(23, 32, 51, 0.72)",
        eyebrow: "#3157d5",
        controlBg: "rgba(23, 32, 51, 0.08)",
        controlBorder: "rgba(23, 32, 51, 0.14)",
      }
    : {
        text: "#ffffff",
        muted: "rgba(255, 255, 255, 0.78)",
        eyebrow: "#b8c6ff",
        controlBg: "rgba(255, 255, 255, 0.12)",
        controlBorder: "rgba(255, 255, 255, 0.22)",
      };
}

function applyBackgroundColor() {
  const heroColors = getHeroTextColors();
  document.documentElement.style.setProperty("--bg", state.backgroundColor);
  document.documentElement.style.setProperty("--hero-start", state.heroStartColor);
  document.documentElement.style.setProperty("--hero-end", state.heroEndColor);
  document.documentElement.style.setProperty("--hero-text", heroColors.text);
  document.documentElement.style.setProperty("--hero-muted", heroColors.muted);
  document.documentElement.style.setProperty("--hero-eyebrow", heroColors.eyebrow);
  document.documentElement.style.setProperty("--hero-control-bg", heroColors.controlBg);
  document.documentElement.style.setProperty("--hero-control-border", heroColors.controlBorder);
}

function renderRole() {
  const role = getCurrentRole();
  const isTeacher = role === "teacher";
  const isStudent = role === "student";

  elements.currentRoleLabel.textContent = isTeacher ? "담임선생님 모드" : isStudent ? "학생 모드" : "방문자 모드";
  elements.currentRoleDescription.textContent = isTeacher
    ? `${getSessionNickname()} 계정으로 승인, 제재, 배경과 타이틀 색상을 관리합니다.`
    : isStudent
      ? `${getSessionNickname()} 계정으로 로그인했습니다. 일반 파일 수정과 요청을 사용할 수 있습니다.`
      : "로그인 전에는 열람 및 관람이 불가합니다.";
  elements.teacherPanel.classList.toggle("hidden", !isTeacher);
  elements.newFileRequestButton.classList.toggle("hidden", isTeacher);
}

function renderAuth() {
  elements.loginStatus.textContent = state.session ? `${state.session.nickname} 로그인 중` : "방문자 모드";
  elements.loginStatus.className = `status-badge ${state.session ? "status-approved" : "status-open"}`;

  elements.authPanelBody.innerHTML = isLoggedIn()
    ? `<button class="ghost-button" data-auth-action="logout" type="button">로그아웃</button>`
    : `<button class="primary-button" data-auth-action="open-login" type="button">로그인 창 열기</button>`;
}

function renderStudentWarning() {
  const blocked = isStudentBlocked();
  const needsLogin = !isLoggedIn();
  elements.studentWarning.classList.toggle("hidden", !blocked && !needsLogin);
  elements.studentWarning.textContent = blocked
    ? `${getCurrentStudent().name} 학생은 현재 위키 활동금지 상태입니다. 파일 수정과 추가 요청이 제한됩니다.`
    : "로그인 전에는 폴더와 파일 열람만 가능합니다. 수정하려면 지급된 계정으로 로그인하세요.";
}

function renderFolderList() {
  if (!isLoggedIn()) {
    elements.folderList.innerHTML = getLockedMarkup("compact");
    return;
  }

  elements.folderList.innerHTML = state.folders
    .map((folder) => {
      const count = folder.id === "all" ? state.files.length : state.files.filter((file) => file.folderId === folder.id).length;

      return `
        <button class="folder-card ${folder.id === state.selectedFolderId ? "active" : ""}" data-folder-id="${folder.id}" type="button">
          <strong>${escapeHtml(folder.name)} · ${count}개</strong>
          <p>${escapeHtml(folder.description)}</p>
        </button>
      `;
    })
    .join("");
}

function renderFileList() {
  if (!isLoggedIn()) {
    elements.fileList.innerHTML = "";
    return;
  }

  const visibleFiles = getVisibleFiles();

  if (!visibleFiles.length) {
    elements.fileList.innerHTML = `
      <div class="empty-state">
        <strong>이 폴더에는 파일이 없습니다.</strong>
        <p>학생이 파일 추가 요청을 보내고 담임선생님이 승인하면 파일이 생성됩니다.</p>
      </div>
    `;
    return;
  }

  if (!visibleFiles.some((file) => file.id === state.selectedFileId)) {
    state.selectedFileId = visibleFiles[0].id;
  }

  elements.fileList.innerHTML = visibleFiles
    .map(
      (file) => `
        <button class="file-card ${file.id === state.selectedFileId ? "active" : ""}" data-file-id="${file.id}" type="button">
          <span class="badge badge-${file.type}">${typeLabels[file.type]}</span>
          <strong>${escapeHtml(file.title)}</strong>
          <p>${escapeHtml(getFolderName(file.folderId))} · ${typeRules[file.type]}</p>
        </button>
      `,
    )
    .join("");
}

function renderFileDetail() {
  if (!isLoggedIn()) {
    elements.fileDetail.innerHTML = getLockedMarkup();
    return;
  }

  const file = getSelectedFile();
  const teacherCanEdit = isTeacherLoggedIn();
  const studentCanEdit = canStudentEdit();
  const canSubmit = teacherCanEdit || studentCanEdit;
  const canSaveDirectly = teacherCanEdit || (studentCanEdit && file.type === "normal");
  const buttonLabel = canSaveDirectly ? "수정 저장" : "수정 요청 보내기";
  const disabledMessage = isLoggedIn()
    ? "현재 계정은 이 파일을 수정할 수 없습니다."
    : "로그인해야 파일을 수정하거나 수정 요청을 보낼 수 있습니다.";

  elements.fileDetail.innerHTML = `
    <div class="file-detail">
      <div class="file-title-row">
        <div>
          <span class="badge badge-${file.type}">${typeLabels[file.type]}</span>
          <h2>${escapeHtml(file.title)}</h2>
        </div>
        <span class="status-badge status-open">${typeRules[file.type]}</span>
      </div>

      <div class="meta-row">
        <span>폴더: ${escapeHtml(getFolderName(file.folderId))}</span>
        <span>최근 수정: ${escapeHtml(file.updatedBy)}</span>
        <span>${escapeHtml(file.updatedAt)}</span>
      </div>

      <div class="toolbar" aria-label="글자 스타일 도구">
        <label>
          글자 크기
          <select id="font-size-control">
            <option value="16">작게</option>
            <option value="18">기본</option>
            <option value="22">크게</option>
            <option value="26">매우 크게</option>
          </select>
        </label>
        <label>
          글자 색상
          <input id="font-color-control" type="color" value="${state.previewStyle.color}" />
        </label>
      </div>

      <div
        id="content-preview"
        class="content-preview"
        style="font-size: ${state.previewStyle.fontSize}px; color: ${state.previewStyle.color};"
      >${escapeHtml(file.content)}</div>

      <form id="editor-form" class="editor-form">
        <label>
          본문 수정
          <textarea id="content-editor" ${canSubmit ? "" : "disabled"}>${escapeHtml(file.content)}</textarea>
        </label>
        ${canSubmit ? "" : `<div class="notice">${disabledMessage}</div>`}
        <button class="primary-button" type="submit" ${canSubmit ? "" : "disabled"}>${buttonLabel}</button>
      </form>
    </div>
  `;

  const fontSizeControl = document.querySelector("#font-size-control");
  const fontColorControl = document.querySelector("#font-color-control");
  const contentEditor = document.querySelector("#content-editor");

  fontSizeControl.value = String(state.previewStyle.fontSize);
  fontSizeControl.addEventListener("change", handleFontSizeChange);
  fontColorControl.addEventListener("input", handleFontColorChange);
  contentEditor.addEventListener("input", handleEditorPreview);
  document.querySelector("#editor-form").addEventListener("submit", handleEditorSubmit);
}

function renderRequestCards(requests, withActions) {
  if (requests.length === 0) {
    return `
      <div class="empty-state">
        <strong>표시할 요청이 없습니다.</strong>
        <p>파일 수정 또는 추가 요청을 보내면 이곳에 나타납니다.</p>
      </div>
    `;
  }

  return requests
    .map((request) => {
      const title = request.title ?? getFileTitle(request.fileId);
      const folderText = request.folderId ? `<p>폴더: ${escapeHtml(getFolderName(request.folderId))}</p>` : "";
      const voteText =
        request.kind === "edit-important"
          ? `<p>찬성 ${request.votes ?? 0}명 / 필요 ${request.requiredVotes ?? 0}명</p>`
          : "";
      const pendingActions =
        withActions && isTeacherLoggedIn() && request.status === "pending"
          ? `
            <div class="request-actions">
              <button class="primary-button" data-request-action="approved" data-request-id="${request.id}" type="button">승인</button>
              <button class="danger-button" data-request-action="rejected" data-request-id="${request.id}" type="button">반려</button>
            </div>
          `
          : "";
      const voteActions =
        withActions && isTeacherLoggedIn() && request.status === "open"
          ? `
            <div class="request-actions">
              <button class="secondary-button" data-request-action="add-vote" data-request-id="${request.id}" type="button">데모 찬성 1표 추가</button>
              <button class="primary-button" data-request-action="approved" data-request-id="${request.id}" type="button">과반수 충족 처리</button>
            </div>
          `
          : "";

      return `
        <article class="request-card">
          <div class="file-title-row">
            <span class="badge">${requestLabels[request.kind]}</span>
            <span class="status-badge status-${request.status}">${statusLabels[request.status]}</span>
          </div>
          <h3>${escapeHtml(title)}</h3>
          <p>요청자: ${escapeHtml(getStudentName(request.requesterId))}</p>
          ${folderText}
          <p>${escapeHtml(request.description)}</p>
          ${voteText}
          ${pendingActions}
          ${voteActions}
        </article>
      `;
    })
    .join("");
}

function renderRequests() {
  if (!isLoggedIn()) {
    elements.requestList.innerHTML = getLockedMarkup("compact");
    elements.teacherRequestList.innerHTML = "";
    return;
  }

  const visibleRequests =
    state.session?.role === "student"
      ? state.requests.filter((request) => request.requesterId === state.session.id)
      : state.requests;

  elements.requestList.innerHTML = renderRequestCards(visibleRequests, false);
  elements.teacherRequestList.innerHTML = renderRequestCards(state.requests, true);
}

function renderStudents() {
  elements.studentList.innerHTML = state.students
    .map(
      (student) => `
        <div class="student-row">
          <div>
            <strong>${escapeHtml(student.nickname)}</strong>
            <p>${student.banned ? "위키 활동금지 상태" : "위키 활동 가능"}</p>
            <p>아이디 ${escapeHtml(student.username)}</p>
            <p class="helper-text">닉네임은 수정할 수 없습니다.</p>
          </div>
          <button
            class="${student.banned ? "secondary-button" : "danger-button"}"
            data-student-id="${student.id}"
            type="button"
            ${isTeacherLoggedIn() ? "" : "disabled"}
          >
            ${student.banned ? "제재 해제" : "활동금지"}
          </button>
        </div>
      `,
    )
    .join("");
}

function renderBackgroundPalette() {
  elements.backgroundPalette.innerHTML = colorHuntColors
    .map(
      (color, index) => `
        <button
          class="palette-button ${state.backgroundColor === color ? "active" : ""}"
          data-background-color="${color}"
          style="background: ${color};"
          type="button"
          ${isTeacherLoggedIn() ? "" : "disabled"}
        >
          ${index + 1}. ${color}
        </button>
      `,
    )
    .join("");
}

function render() {
  applyBackgroundColor();
  renderRole();
  renderAuth();
  renderStudentWarning();
  renderFolderList();
  renderFileList();
  renderFileDetail();
  renderRequests();
  renderStudents();
  renderBackgroundPalette();
}

function handleLogin(event) {
  event.preventDefault();

  const username = document.querySelector("#login-username").value.trim();
  const password = document.querySelector("#login-password").value.trim();
  const student = state.students.find((item) => item.legacyUsername === username && item.password === password);
  const isTeacher = teacherAccount.legacyUsername === username && teacherAccount.password === password;

  if (!student && !isTeacher) {
    document.querySelector("#login-error").classList.remove("hidden");
    return;
  }
  document.querySelector("#login-error").classList.add("hidden");

  if (isTeacher) {
    state.session = { id: teacherAccount.id, role: "teacher", name: teacherAccount.name, nickname: teacherAccount.nickname };
  } else {
    state.session = { id: student.id, role: "student", name: student.name, nickname: student.nickname };
    state.currentStudentId = student.id;
  }

  closeModal("login");
  showToast(`${state.session.nickname} 계정으로 로그인했습니다.`);
  render();
}

function handleLogout() {
  state.session = null;
  showToast("로그아웃했습니다. 방문자 모드로 전환됩니다.");
  render();
}

function handleFolderSelect(event) {
  const folderButton = event.target.closest("[data-folder-id]");
  if (!folderButton) return;

  state.selectedFolderId = folderButton.dataset.folderId;
  const visibleFiles = getVisibleFiles();
  if (visibleFiles.length) {
    state.selectedFileId = visibleFiles[0].id;
  }
  render();
}

function handleFileSelect(event) {
  const fileButton = event.target.closest("[data-file-id]");
  if (!fileButton) return;

  state.selectedFileId = Number(fileButton.dataset.fileId);
  render();
}

function handleFontSizeChange(event) {
  state.previewStyle.fontSize = Number(event.target.value);
  document.querySelector("#content-preview").style.fontSize = `${state.previewStyle.fontSize}px`;
}

function handleFontColorChange(event) {
  state.previewStyle.color = event.target.value;
  document.querySelector("#content-preview").style.color = state.previewStyle.color;
}

function handleEditorPreview(event) {
  document.querySelector("#content-preview").textContent = event.target.value;
}

function handleEditorSubmit(event) {
  event.preventDefault();

  if (!isLoggedIn()) {
    showToast("로그인 후 수정할 수 있습니다.");
    return;
  }

  if (isStudentBlocked()) {
    showToast("활동금지 상태에서는 수정할 수 없습니다.");
    return;
  }

  const file = getSelectedFile();
  const nextContent = document.querySelector("#content-editor").value.trim();

  if (!nextContent) {
    showToast("본문 내용을 입력해 주세요.");
    return;
  }

  if (isTeacherLoggedIn() || file.type === "normal") {
    file.content = nextContent;
    file.updatedBy = isTeacherLoggedIn() ? "담임선생님" : getCurrentStudent().name;
    file.updatedAt = "방금 전";
    showToast("파일 내용이 저장되었습니다.");
    render();
    return;
  }

  const kind = file.type === "critical" ? "edit-critical" : "edit-important";
  const alreadyRequested = state.requests.some(
    (request) =>
      request.fileId === file.id &&
      request.requesterId === state.session.id &&
      request.kind === kind &&
      ["pending", "open"].includes(request.status),
  );

  if (alreadyRequested) {
    showToast("이미 진행 중인 요청이 있습니다.");
    return;
  }

  state.requests.unshift({
    id: state.nextRequestId++,
    kind,
    fileId: file.id,
    requesterId: state.session.id,
    status: kind === "edit-important" ? "open" : "pending",
    votes: kind === "edit-important" ? 1 : undefined,
    requiredVotes: kind === "edit-important" ? Math.floor(state.students.length / 2) + 1 : undefined,
    description:
      kind === "edit-important"
        ? "중요 파일 수정을 위해 반 과반수 동의를 기다리는 중입니다."
        : "최중요 파일 수정을 위해 담임선생님의 승인을 기다리는 중입니다.",
  });
  showToast("수정 요청을 보냈습니다.");
  render();
}

function handleNewFileRequest() {
  if (!canStudentEdit()) {
    showToast(isLoggedIn() ? "현재 계정은 파일 추가 요청을 보낼 수 없습니다." : "로그인 후 파일 추가를 요청할 수 있습니다.");
    return;
  }

  const title = window.prompt("추가하고 싶은 파일 제목을 입력해 주세요.", "새 학급 파일");
  if (!title?.trim()) return;

  state.requests.unshift({
    id: state.nextRequestId++,
    kind: "create-file",
    title: title.trim(),
    folderId: state.selectedFolderId === "all" ? "notice" : state.selectedFolderId,
    requesterId: state.session.id,
    status: "pending",
    description: "학생이 새 파일 생성을 요청했습니다. 담임선생님의 승인이 필요합니다.",
  });
  showToast("파일 추가 요청을 보냈습니다.");
  render();
}

function handleRequestAction(event) {
  const actionButton = event.target.closest("[data-request-action]");
  if (!actionButton) return;

  if (!isTeacherLoggedIn()) {
    showToast("담임선생님 계정으로 로그인해야 처리할 수 있습니다.");
    return;
  }

  const request = state.requests.find((item) => item.id === Number(actionButton.dataset.requestId));
  if (!request) return;

  const action = actionButton.dataset.requestAction;

  if (action === "add-vote") {
    request.votes = Math.min((request.votes ?? 0) + 1, request.requiredVotes ?? 0);
    if (request.votes >= request.requiredVotes) {
      request.status = "approved";
    }
    showToast("데모 찬성표가 추가되었습니다.");
    render();
    return;
  }

  request.status = action;

  if (action === "approved" && request.kind === "create-file") {
    state.files.push({
      id: state.nextFileId++,
      folderId: request.folderId ?? "notice",
      title: request.title,
      type: "normal",
      content: "담임선생님 승인으로 생성된 새 파일입니다. 학생들이 내용을 채워 넣을 수 있습니다.",
      updatedBy: "담임선생님",
      updatedAt: "방금 전",
    });
  }

  showToast(action === "approved" ? "요청을 승인했습니다." : "요청을 반려했습니다.");
  render();
}

function handleStudentSanction(event) {
  const studentButton = event.target.closest("[data-student-id]");
  if (!studentButton) return;

  if (!isTeacherLoggedIn()) {
    showToast("담임선생님 계정으로 로그인해야 제재를 변경할 수 있습니다.");
    return;
  }

  const student = state.students.find((item) => item.id === Number(studentButton.dataset.studentId));
  if (!student) return;

  student.banned = !student.banned;
  showToast(student.banned ? `${student.name} 학생을 활동금지했습니다.` : `${student.name} 학생의 제재를 해제했습니다.`);
  render();
}

function handleBackgroundChange(event) {
  const colorButton = event.target.closest("[data-background-color]");
  if (!colorButton) return;

  if (!isTeacherLoggedIn()) {
    showToast("담임선생님 계정으로 로그인해야 배경을 바꿀 수 있습니다.");
    return;
  }

  state.backgroundColor = colorButton.dataset.backgroundColor;
  const colorIndex = colorHuntColors.indexOf(state.backgroundColor);
  state.heroStartColor = state.backgroundColor;
  state.heroEndColor = colorHuntColors[(colorIndex + 1) % colorHuntColors.length];
  showToast(`배경과 타이틀 색상을 ${state.backgroundColor} 계열로 변경했습니다.`);
  render();
}

function handleSendMail() {
  openModal("mail");
}

function handleMailFormSubmit(event) {
  event.preventDefault();
  const email = elements.mailEmailInput.value.trim();
  if (!email) return;

  const student = state.students.find((s) => s.username === email);
  const isTeacher = teacherAccount.username === email;
  const account = isTeacher ? teacherAccount : (student ?? null);

  let credentialsHtml = "";
  let bodyText = "";

  if (account) {
    bodyText = `안녕하세요, ${account.nickname}님!\n\n우리학급위키 임시 로그인 계정을 안내드립니다.\n\n아이디: ${account.legacyUsername}\n비밀번호: ${account.password}\n\n위 정보로 로그인해 주세요.`;
    credentialsHtml = `
      <h4>발급된 계정 정보</h4>
      <div class="mail-credential-row">
        <span class="mail-credential-label">닉네임</span>
        <span class="mail-credential-value">${escapeHtml(account.nickname)}</span>
      </div>
      <div class="mail-credential-row">
        <span class="mail-credential-label">아이디</span>
        <span class="mail-credential-value">${escapeHtml(account.legacyUsername)}</span>
      </div>
      <div class="mail-credential-row">
        <span class="mail-credential-label">비밀번호</span>
        <span class="mail-credential-value">${escapeHtml(account.password)}</span>
      </div>
    `;
  } else {
    bodyText = `안녕하세요!\n\n우리학급위키 임시 로그인 계정을 안내드립니다.\n\n아이디: \n비밀번호: \n\n위 정보로 로그인해 주세요.`;
    credentialsHtml = `<p class="helper-text">등록된 계정이 없습니다. Gmail에서 아이디와 비밀번호를 직접 입력해 주세요.</p>`;
  }

  const subjectRaw = "[우리학급위키] 임시 로그인 계정 안내";

  elements.mailResult.classList.remove("hidden");
  elements.mailResult.innerHTML = `
    ${credentialsHtml}
    <button class="primary-button mail-open-link" id="gmail-send-btn" type="button">
      Google 계정으로 발송
    </button>
  `;

  document.getElementById("gmail-send-btn").addEventListener("click", () => {
    const sent = requestGmailSend(email, subjectRaw, bodyText);
    if (!sent) {
      const fallbackBody = encodeURIComponent(bodyText);
      const fallbackSubject = encodeURIComponent(subjectRaw);
      const gmailHref = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(email)}&su=${fallbackSubject}&body=${fallbackBody}`;
      window.open(gmailHref, "_blank", "noopener");
    }
  });
}

function handleAuthClick(event) {
  if (event.target.closest('[data-auth-action="open-login"]')) {
    openModal("login");
  }
  if (event.target.closest('[data-auth-action="logout"]')) {
    handleLogout();
  }
}

function openModal(kind) {
  if (kind === "login") elements.loginModal.classList.remove("hidden");
  if (kind === "mail") {
    elements.mailModal.classList.remove("hidden");
    elements.mailEmailInput.value = "";
    elements.mailResult.classList.add("hidden");
    elements.mailResult.innerHTML = "";
  }
}

function closeModal(kind) {
  if (kind === "login") {
    elements.loginModal.classList.add("hidden");
    document.querySelector("#login-error").classList.add("hidden");
  }
  if (kind === "mail") elements.mailModal.classList.add("hidden");
}

function handleModalClick(event) {
  const closeButton = event.target.closest("[data-close-modal]");
  if (closeButton) {
    closeModal(closeButton.dataset.closeModal);
    return;
  }
  if (event.target === elements.loginModal) closeModal("login");
  if (event.target === elements.mailModal) closeModal("mail");
}

elements.sendMailButton.addEventListener("click", handleSendMail);
elements.authPanelBody.addEventListener("click", handleAuthClick);
document.querySelector("#login-form").addEventListener("submit", handleLogin);
elements.loginModal.addEventListener("click", handleModalClick);
elements.mailModal.addEventListener("click", handleModalClick);
elements.mailForm.addEventListener("submit", handleMailFormSubmit);
elements.folderList.addEventListener("click", handleFolderSelect);
elements.fileList.addEventListener("click", handleFileSelect);
elements.newFileRequestButton.addEventListener("click", handleNewFileRequest);
elements.teacherRequestList.addEventListener("click", handleRequestAction);
elements.studentList.addEventListener("click", handleStudentSanction);
elements.backgroundPalette.addEventListener("click", handleBackgroundChange);

render();
