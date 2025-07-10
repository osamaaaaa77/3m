const socket = io();

let myId = null;
let myName = "";
let isSpy = false;
let voted = false;

socket.on("connect", () => {
  myId = socket.id;
});

// إرسال الاسم عند تسجيل الدخول
function setName(name) {
  myName = name;
  socket.emit("set-name", name);
}

// استقبال تأكيد الاتصال مع المعرف
socket.on("connected", (data) => {
  myId = data.id;
});

// بدء اللعبة واستلام معلومات الجلسة
socket.on("start-game", (data) => {
  isSpy = (data.spyId === myId);
  // تحديث واجهة المستخدم يتم في index.html مباشرة عبر socket handlers
  voted = false;
});

// إرسال تلميح العميل أو اللاعبين
function submitHint(hint) {
  if (!hint || hint.trim() === "") return;
  socket.emit("submit-hint", hint.trim());
}

// استقبال ظهور التلميحات بعد انتهاء الجميع
socket.on("show-hints", (data) => {
  // سيتم عرض التلميحات في واجهة المستخدم مباشرة في index.html
});

// إرسال التصويت
function voteSpy(spyId) {
  if (voted) return;
  socket.emit("vote-spy", spyId);
  voted = true;
}

// استقبال نتيجة التصويت
socket.on("show-result", (data) => {
  // عرض النتيجة يتم في index.html مباشرة
});

// استقبال رسائل الشات
socket.on("chat-message", (data) => {
  // عرض الشات يتم في index.html مباشرة
});

// إرسال رسالة الشات عند الضغط على Enter
document.getElementById("chatInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const msg = e.target.value.trim();
    if (msg.length > 0) {
      socket.emit("chat-message", msg);
      e.target.value = "";
    }
  }
});

// تعريض التنبيهات في حالة قطع الاتصال
socket.on("disconnect", () => {
  alert("تم قطع الاتصال بالخادم");
  location.reload();
});

// ربط أزرار الإدخال بالواجهة
document.getElementById("enterGameBtn").addEventListener("click", () => {
  const name = document.getElementById("nameInput").value.trim();
  if (name) {
    setName(name);
  }
});

document.getElementById("submitHint").addEventListener("click", () => {
  const hint = document.getElementById("hintInput").value.trim();
  if (hint && !hint.includes(" ")) {
    submitHint(hint);
    document.getElementById("hintInput").value = "";
    document.getElementById("hintInput").disabled = true;
    document.getElementById("submitHint").disabled = true;
  } else {
    alert("يجب أن تكون كلمة واحدة فقط!");
  }
});
