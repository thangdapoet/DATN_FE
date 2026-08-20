import { useState, useEffect } from "react";
import { getHistoryGroupedByDateAsync } from "../api/python";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FiCamera,
  FiBarChart2,
  FiAlertCircle,
  FiUserCheck,
  FiUserX,
  FiCreditCard,
  FiLock,
  FiShield,
  FiTrash2,
  FiFilter,
  FiKey,
  FiUsers,
} from "react-icons/fi";

export default function CameraDashboard() {
  // ==========================================
  // 1. STATE MANAGEMENT
  // ==========================================
  // UI & Modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserManager, setShowUserManager] = useState(false);
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [albumOpen, setAlbumOpen] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [passTab, setPassTab] = useState("web");

  // Data & Actions
  const [adminPassword, setAdminPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [pendingAction, setPendingAction] = useState("");
  const [historyByDate, setHistoryByDate] = useState({});
  const [selectedDate, setSelectedDate] = useState("");
  const [events, setEvents] = useState([]);
  const [currentOtp, setCurrentOtp] = useState("");
  const [passwords, setPasswords] = useState({ old: "", new: "", confirm: "" });
  const [doorPasswords, setDoorPasswords] = useState({ new: "", confirm: "" });
  const [changePassStatus, setChangePassStatus] = useState({
    type: "",
    message: "",
  });

  // Filters
  const [appliedEvents, setAppliedEvents] = useState([]);
  const [appliedUIDs, setAppliedUIDs] = useState([]);
  const [tempEvents, setTempEvents] = useState([]);
  const [tempUIDs, setTempUIDs] = useState([]);

  // ==========================================
  // 2. CONSTANTS & CONFIGS
  // ==========================================
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const WS_URL = API_BASE_URL.replace("http", "ws") + "/ws/events";

  const fixedEvents = [
    { id: "UNKNOWN_FACE", label: "Người lạ quét mặt" },
    { id: "ADMIN_REGISTERED", label: "Đăng ký mới" },
    { id: "PASS_LOCKED", label: "Khóa mật khẩu" },
    { id: "RFID_LOCKED", label: "Khóa thẻ từ" },
    { id: "FACE_LOCKED", label: "Khóa Face ID" },
    { id: "CLONED_WARNING", label: "Thẻ giả mạo" },
    { id: "FAKE_OR_STRANGER", label: "Mặt không khớp" },
    { id: "SPAM_WARNING", label: "Spam thẻ" },
    { id: "NO_REGISTRATION_FACE", label: "Chưa đăng ký mặt" },
    { id: "FACE_NOT_FOUND", label: "Không thấy mặt" },
    { id: "WEB_REMOTE_UNLOCK", label: "Mở cửa qua Web" },
    { id: "WEB_STOPPED_ALARM", label: "Tắt báo động qua Web" },
    { id: "WEB_ADMIN_DELETED", label: "Xóa hồ sơ qua Web" },
  ];

  // ==========================================
  // 3. DERIVED DATA (CALCULATIONS)
  // ==========================================
  const baseItems = historyByDate[selectedDate] || [];
  const sortedDates = Object.keys(historyByDate).sort(
    (a, b) => new Date(b) - new Date(a),
  );
  const uniqueUIDs = [...new Set(baseItems.map((h) => h.UID))]
    .filter(Boolean)
    .filter((uid) => uid !== "WEB_ADMIN" && uid !== "UNKNOWN");

  const tempFilteredCount = baseItems.filter((item) => {
    const matchEvent =
      tempEvents.length === 0 || tempEvents.includes(item.Status);
    const matchUID = tempUIDs.length === 0 || tempUIDs.includes(item.UID);
    return matchEvent && matchUID;
  }).length;

  const displayedItems = baseItems.filter((item) => {
    const matchEvent =
      appliedEvents.length === 0 || appliedEvents.includes(item.Status);
    const matchUID = appliedUIDs.length === 0 || appliedUIDs.includes(item.UID);
    return matchEvent && matchUID;
  });

  const handleMove = async (direction, action) => {
    await fetch(`${API_BASE_URL}/api/camera/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction, action }),
    });
  };

  // Cấu trúc nút điều hướng
  const DPadButton = ({ direction, label, onMove }) => (
    <button
      onMouseDown={() => onMove(direction, "start")}
      onMouseUp={() => onMove(direction, "stop")}
      onMouseLeave={() => onMove(direction, "stop")}
      onTouchStart={() => onMove(direction, "start")}
      onTouchEnd={() => onMove(direction, "stop")}
      className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 active:bg-[#A8C7FA] active:text-[#052D49] rounded-full text-[#E3E3E3] transition-all backdrop-blur-sm"
    >
      {label}
    </button>
  );
  // ==========================================
  // 4. EFFECTS (LIFECYCLE)
  // ==========================================
  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    const socket = new WebSocket(WS_URL);
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const newEvent = { ...data, time: new Date().toLocaleTimeString() };

      setEvents((prevEvents) => [newEvent, ...prevEvents].slice(0, 15));

      if (
        data.status === "bad" ||
        data.message.includes("Đã thêm") ||
        data.message.includes("Đã xóa")
      ) {
        loadHistory();
      }
    };
    return () => socket.close();
  }, []);

  // ==========================================
  // 5. API CALLS & BUSINESS LOGIC
  // ==========================================
  const loadHistory = async () => {
    try {
      const data = await getHistoryGroupedByDateAsync();
      setHistoryByDate(data);
      const dates = Object.keys(data);
      if (dates.length > 0) {
        const newest = dates.sort((a, b) => new Date(b) - new Date(a))[0];
        setSelectedDate(newest);
      } else {
        setSelectedDate("");
      }
    } catch (error) {}
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users`);
      const data = await res.json();
      setRegisteredUsers(data.users);
    } catch (err) {}
  };

  const handleVerifyAdmin = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/verify-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword }),
      });
      const data = await res.json();

      if (data.status === "success") {
        setShowAuthModal(false);
        setAdminPassword("");
        setAuthError("");

        if (pendingAction === "userManager") {
          setShowUserManager(true);
          fetchUsers();
        } else if (pendingAction === "unlock") {
          // Xử lý gọi API và thêm Toast cho Mở cửa
          try {
            const unlockRes = await fetch(`${API_BASE_URL}/api/remote-unlock`, {
              method: "POST",
            });
            const unlockData = await unlockRes.json();
            if (unlockData.status === "success") {
              toast.success("Đã gửi lệnh mở cửa thành công");
            } else {
              toast.error("Lỗi từ server: " + unlockData.message);
            }
          } catch (e) {
            toast.error("Lỗi kết nối khi gửi lệnh mở cửa");
          }
        } else if (pendingAction === "stopAlarm") {
          // Xử lý gọi API và thêm Toast cho Tắt báo động
          try {
            const alarmRes = await fetch(
              `${API_BASE_URL}/api/remote-stop-alarm`,
              { method: "POST" },
            );
            const alarmData = await alarmRes.json();
            if (alarmData.status === "success") {
              toast.success("Đã gửi lệnh tắt báo động");
            } else {
              toast.error("Lỗi từ server: " + alarmData.message);
            }
          } catch (e) {
            toast.error("Lỗi kết nối khi tắt báo động");
          }
        }
        setPendingAction("");
      } else {
        // Có thể thay đổi authError thành toast nếu bạn muốn đồng bộ giao diện
        setAuthError(data.message);
      }
    } catch (err) {
      setAuthError("Lỗi kết nối đến Server");
    }
  };

  const handleDeleteUser = async (uid) => {
    const isConfirm = window.confirm(
      `CẢNH BÁO: Xóa hồ sơ & thẻ của [${uid}]?\nHành động này không thể hoàn tác!`,
    );
    if (!isConfirm) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${uid}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.status === "success") {
        fetchUsers();
        // Thông báo thành công
        toast.success(`Đã xóa người dùng ${uid}`);
      } else {
        // Thay thế alert mặc định
        toast.error("Lỗi từ server: " + data.message);
      }
    } catch (err) {
      toast.error("Lỗi kết nối đến Server");
    }
  };

  const handleGenerateOTP = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/generate-otp`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.status === "success") {
        setCurrentOtp(data.otp);
        setShowOtpModal(true);
        toast.success("Đã tạo OTP thành công!");
      }
    } catch (err) {
      // Thay thế alert mặc định
      toast.error("Lỗi kết nối Server khi tạo OTP");
    }
  };

  const handleChangePassword = async () => {
    setChangePassStatus({ type: "", message: "" });
    if (passwords.new !== passwords.confirm) {
      return setChangePassStatus({
        type: "error",
        message: "Mật khẩu xác nhận không khớp",
      });
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/change-admin-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          old_password: passwords.old,
          new_password: passwords.new,
        }),
      });
      const data = await res.json();

      if (data.status === "success") {
        setChangePassStatus({ type: "success", message: data.message });
        setTimeout(() => {
          setShowChangePassModal(false);
          setPasswords({ old: "", new: "", confirm: "" });
          setChangePassStatus({ type: "", message: "" });
        }, 1500);
      } else {
        setChangePassStatus({ type: "error", message: data.message });
      }
    } catch (err) {
      setChangePassStatus({ type: "error", message: "Lỗi kết nối Server" });
    }
  };

  const handleChangeDoorPassword = async () => {
    setChangePassStatus({ type: "", message: "" });
    if (doorPasswords.new !== doorPasswords.confirm) {
      return setChangePassStatus({
        type: "error",
        message: "Mật khẩu xác nhận không khớp",
      });
    }
    if (doorPasswords.new.length < 4 || doorPasswords.new.length > 16) {
      return setChangePassStatus({
        type: "error",
        message: "Mật khẩu cửa phải từ 4 - 16 ký tự",
      });
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/remote-change-door-pass`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: doorPasswords.new }),
      });
      const data = await res.json();

      if (data.status === "success") {
        setChangePassStatus({
          type: "success",
          message: "Đổi mật khẩu cửa thành công",
        });
        setTimeout(() => {
          setShowChangePassModal(false);
          setDoorPasswords({ new: "", confirm: "" });
          setChangePassStatus({ type: "", message: "" });
        }, 1500);
      } else {
        setChangePassStatus({ type: "error", message: data.message });
      }
    } catch (err) {
      setChangePassStatus({ type: "error", message: "Lỗi kết nối Server" });
    }
  };

  // ==========================================
  // 6. UI HANDLERS (CLICKS & FILTERS)
  // ==========================================
  const toggleTempEvent = (id) =>
    setTempEvents((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id],
    );
  const toggleTempUID = (uid) =>
    setTempUIDs((prev) =>
      prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid],
    );
  const handleApplyFilter = () => {
    setAppliedEvents(tempEvents);
    setAppliedUIDs(tempUIDs);
    setShowFilter(false);
  };
  const handleClearFilter = () => {
    setTempEvents([]);
    setTempUIDs([]);
  };
  const openFilterPanel = () => {
    setTempEvents(appliedEvents);
    setTempUIDs(appliedUIDs);
    setShowFilter(true);
  };

  const handleRemoteUnlockClick = () => {
    setPendingAction("unlock");
    setShowAuthModal(true);
  };
  const handleStopAlarmClick = () => {
    setPendingAction("stopAlarm");
    setShowAuthModal(true);
  };
  const handleUserManagerClick = () => {
    setPendingAction("userManager");
    setShowAuthModal(true);
  };

  const getBadgeConfig = (status) => {
    switch (status) {
      case "SPAM_WARNING":
      case "PASS_LOCKED":
      case "RFID_LOCKED":
      case "FACE_LOCKED":
      case "CLONED_WARNING":
        return { style: "bg-[#5c1c1c] text-[#F2B8B5]" };
      case "FAKE_OR_STRANGER":
      case "FACE_NOT_FOUND":
      case "NO_REGISTRATION_FACE":
      case "UNKNOWN_FACE":
        return { style: "bg-[#423E2A] text-[#E3D081]" };
      case "ADMIN_REGISTERED":
      case "SUCCESS":
      case "WEB_REMOTE_UNLOCK":
        return { style: "bg-[#0F5223] text-[#C4EED0]" };
      default:
        return { style: "bg-[#282A2D] text-[#C4C7C5]" };
    }
  };

  // ==========================================
  // 7. RENDER COMPONENT
  // ==========================================
  return (
    <div className="min-h-screen bg-[#131314] p-6 md:p-8 text-[#E3E3E3] font-sans selection:bg-[#004A77]">
      <div className="max-w-[1400px] mx-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-[28px] font-normal tracking-wide text-[#E3E3E3] flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Logo Trường"
              className="w-10 h-10 object-contain"
            />
            Security Home
          </h1>
        </div>

        {/* THIẾT BỊ & ĐIỀU KHIỂN */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-[#C4C7C5] mb-4 tracking-wide px-1">
            Lối tắt
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <button
              onClick={handleRemoteUnlockClick}
              className="flex items-center gap-4 bg-[#0F5223] hover:bg-[#146c2e] p-5 rounded-[28px] text-left transition-colors duration-200"
            >
              <div className="text-[26px] text-[#C4EED0]">
                <FiLock />
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-[#C4EED0] text-[15px]">
                  Mở cửa
                </span>
                <span className="text-xs text-[#C4EED0] opacity-80 mt-0.5">
                  Sẵn sàng
                </span>
              </div>
            </button>
            <button
              onClick={handleStopAlarmClick}
              className="flex items-center gap-4 bg-[#423E2A] hover:bg-[#524d34] p-5 rounded-[28px] text-left transition-colors duration-200"
            >
              <div className="text-[26px] text-[#E3D081]">
                <FiAlertCircle />
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-[#E3D081] text-[15px]">
                  Báo động
                </span>
                <span className="text-xs text-[#E3D081] opacity-80 mt-0.5">
                  Tắt
                </span>
              </div>
            </button>
            <button
              onClick={handleGenerateOTP}
              className="flex items-center gap-4 bg-[#004A77] hover:bg-[#005c94] p-5 rounded-[28px] text-left transition-colors duration-200"
            >
              <div className="text-[26px] text-[#C2E7FF]">
                <FiKey />
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-[#C2E7FF] text-[15px]">
                  Mật khẩu tạm thời
                </span>
                <span className="text-xs text-[#C2E7FF] opacity-80 mt-0.5">
                  Tạo OTP
                </span>
              </div>
            </button>
            <button
              onClick={handleUserManagerClick}
              className="flex items-center gap-4 bg-[#282A2D] hover:bg-[#323538] p-5 rounded-[28px] text-left transition-colors duration-200"
            >
              <div className="text-[26px] text-[#A8C7FA]">
                <FiUsers />
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-[#E3E3E3] text-[15px]">
                  Hồ sơ
                </span>
                <span className="text-xs text-[#C4C7C5] mt-0.5">
                  Quản lý User
                </span>
              </div>
            </button>
            <button
              onClick={() => setAlbumOpen(true)}
              className="flex items-center gap-4 bg-[#282A2D] hover:bg-[#323538] p-5 rounded-[28px] text-left transition-colors duration-200"
            >
              <div className="text-[26px] text-[#F2B8B5]">
                <FiCamera />
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-[#E3E3E3] text-[15px]">
                  Camera Logs
                </span>
                <span className="text-xs text-[#C4C7C5] mt-0.5">
                  Xem sự kiện
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* DASHBOARD CHÍNH */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
          {/* DASHBOARD CHÍNH */}
          <div className="xl:col-span-2 flex flex-col gap-4">
            <div className="bg-[#282A2D] rounded-[32px] p-6 w-full relative transition-all duration-300">
              {/* Tiêu đề & Nút Trực tiếp */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium flex items-center gap-2 text-[#E3E3E3]"></h2>
                <div className="flex items-center gap-2 px-3 py-1 bg-[#131314] rounded-full">
                  <span className="w-2 h-2 bg-[#F2B8B5] rounded-full animate-pulse"></span>
                  <span className="text-[#F2B8B5] text-xs font-semibold tracking-wider">
                    TRỰC TIẾP
                  </span>
                </div>
              </div>

              {/* KHUNG VIDEO VÀ D-PAD ĐƯỢC GỘP CHUNG VÀO 1 THẺ GROUP */}
              <div className="flex justify-center w-full">
                <div className="group relative w-full max-w-[720px] bg-[#131314] rounded-[24px] overflow-hidden shadow-lg border border-[#282A2D]">
                  {/* Luồng Video */}
                  <img
                    src={`${API_BASE_URL}/video_feed`}
                    alt="Live Stream"
                    className="w-full object-contain"
                  />

                  {/* Cụm D-pad đè lên góc dưới phải của Video */}
                  <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out z-10">
                    <div className="grid grid-cols-3 gap-1.5 p-2 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl">
                      <div />
                      <DPadButton
                        direction="up"
                        label="▲"
                        onMove={handleMove}
                      />
                      <div />
                      <DPadButton
                        direction="left"
                        label="◀"
                        onMove={handleMove}
                      />
                      <div className="flex items-center justify-center w-10 h-10 text-white/30 text-xs">
                        ●
                      </div>
                      <DPadButton
                        direction="right"
                        label="▶"
                        onMove={handleMove}
                      />
                      <div />
                      <DPadButton
                        direction="down"
                        label="▼"
                        onMove={handleMove}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="xl:col-span-1 w-full flex flex-col gap-4">
            <div className="bg-[#282A2D] rounded-[32px] p-6 relative transition-all duration-300">
              <h2 className="text-lg font-medium flex items-center gap-2 mb-6 text-[#E3E3E3]">
                Lịch sử hôm nay
              </h2>
              <div className="max-h-[360px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {events.length === 0 && (
                  <div className="text-[#C4C7C5] text-sm text-center mt-6">
                    Không có sự kiện mới.
                  </div>
                )}
                {events.map((ev, i) => (
                  <div
                    key={i}
                    className="p-4 bg-[#131314] rounded-[20px] flex flex-col gap-1 transition-all"
                  >
                    <span className="font-normal text-[15px] text-[#E3E3E3] leading-snug">
                      {ev.message}
                    </span>
                    <span className="text-xs text-[#C4C7C5] mt-1">
                      {ev.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL ALBUM BẢO MẬT & BỘ LỌC */}
      {albumOpen && (
        <div
          className="fixed inset-0 bg-[#131314]/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setAlbumOpen(false)}
        >
          <div
            className="bg-[#1A1C1E] rounded-[32px] shadow-2xl w-[90vw] max-w-6xl max-h-[90vh] flex flex-col border border-[#282A2D]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 border-b border-[#282A2D] flex justify-between items-center shrink-0">
              <h2 className="text-2xl font-normal tracking-wide text-[#E3E3E3]">
                Lịch sử Camera
              </h2>
              <button
                onClick={() => setAlbumOpen(false)}
                className="px-6 py-2.5 rounded-full bg-[#282A2D] hover:bg-[#323538] text-[#E3E3E3] transition-all font-medium text-sm"
              >
                Đóng
              </button>
            </div>
            <div className="p-8 overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center mb-8 relative">
                <div className="flex items-center gap-4">
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-[#282A2D] hover:bg-[#323538] transition-colors rounded-full px-5 py-2.5 text-sm outline-none text-[#E3E3E3] cursor-pointer appearance-none"
                  >
                    <option value="" disabled>
                      Chọn ngày...
                    </option>
                    {sortedDates.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={openFilterPanel}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${appliedEvents.length > 0 || appliedUIDs.length > 0 ? "bg-[#C2E7FF] text-[#001D35]" : "bg-[#282A2D] hover:bg-[#323538] text-[#E3E3E3]"}`}
                  >
                    <FiFilter /> Bộ lọc{" "}
                    {(appliedEvents.length > 0 || appliedUIDs.length > 0) &&
                      `(${appliedEvents.length + appliedUIDs.length})`}
                  </button>
                </div>

                {showFilter && (
                  <div className="absolute top-14 left-0 w-full max-w-2xl bg-[#282A2D] rounded-[28px] shadow-2xl z-50 p-8 flex flex-col gap-8">
                    <h3 className="font-medium text-lg text-[#E3E3E3]">
                      Tùy chỉnh hiển thị
                    </h3>
                    <div className="flex flex-col gap-6 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
                      <div>
                        <h4 className="text-[#C4C7C5] font-medium mb-4 text-sm uppercase tracking-wider">
                          Sự kiện
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {fixedEvents.map((ev) => (
                            <button
                              key={ev.id}
                              onClick={() => toggleTempEvent(ev.id)}
                              className={`px-4 py-2 rounded-full text-sm transition-colors ${tempEvents.includes(ev.id) ? "bg-[#C2E7FF] text-[#001D35]" : "bg-[#131314] text-[#E3E3E3] hover:bg-[#323538]"}`}
                            >
                              {ev.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {uniqueUIDs.length > 0 && (
                        <div>
                          <h4 className="text-[#C4C7C5] font-medium mb-4 text-sm uppercase tracking-wider">
                            UID Thẻ
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {uniqueUIDs.map((uid) => (
                              <button
                                key={uid}
                                onClick={() => toggleTempUID(uid)}
                                className={`px-4 py-2 rounded-full text-sm transition-colors ${tempUIDs.includes(uid) ? "bg-[#C2E7FF] text-[#001D35]" : "bg-[#131314] text-[#E3E3E3] hover:bg-[#323538]"}`}
                              >
                                {uid}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        onClick={handleClearFilter}
                        className="px-6 py-2.5 rounded-full text-[#A8C7FA] hover:bg-[#A8C7FA]/10 transition font-medium text-sm"
                      >
                        Bỏ chọn
                      </button>
                      <button
                        onClick={handleApplyFilter}
                        className="px-6 py-2.5 bg-[#A8C7FA] hover:bg-[#8AB4F8] text-[#052D49] rounded-full transition font-medium text-sm"
                      >
                        Hiển thị {tempFilteredCount}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {selectedDate && displayedItems.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {displayedItems.map((h) => (
                    <div
                      key={h.HistoryId}
                      className="p-4 bg-[#282A2D] rounded-[28px] flex flex-col justify-between hover:bg-[#323538] transition-colors group cursor-pointer"
                    >
                      <div>
                        <div className="overflow-hidden rounded-[20px] mb-4 bg-[#131314]">
                          <img
                            src={`${API_BASE_URL}/${h.ImageUrl}`}
                            alt="Capture"
                            className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.target.src =
                                "https://placehold.co/150x150/131314/C4C7C5?text=No+Image";
                            }}
                          />
                        </div>
                        <div className="text-sm font-medium text-[#E3E3E3] mb-1">
                          {h.UID}
                        </div>
                        <div className="mt-2 flex">
                          {(() => {
                            const badge = getBadgeConfig(h.Status);
                            return (
                              <div
                                className={`px-3 py-1.5 text-[11px] font-medium rounded-full ${badge.style}`}
                              >
                                {h.Status}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="text-xs text-[#C4C7C5] mt-4 pt-3 border-t border-[#131314]">
                        {new Date(h.CreatedDate).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-[#C4C7C5] mt-8 text-center bg-[#282A2D] py-16 rounded-[32px]">
                  Chưa có sự kiện nào cho ngày này.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC THỰC */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-[#131314]/90 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#1A1C1E] rounded-[32px] p-8 shadow-2xl w-full max-w-sm flex flex-col items-center">
            <h2 className="text-2xl font-normal mb-6 text-[#E3E3E3]">
              Xác nhận
            </h2>
            <input
              type="password"
              placeholder="Nhập mật khẩu..."
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyAdmin()}
              className="w-full bg-[#282A2D] rounded-[20px] px-5 py-4 text-[#E3E3E3] outline-none focus:bg-[#323538] mb-4 transition-all text-center tracking-widest text-lg"
              autoFocus
            />
            {authError && (
              <p className="text-[#F2B8B5] text-sm font-medium mb-4">
                {authError}
              </p>
            )}
            <div className="flex gap-3 w-full mt-2">
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  setAuthError("");
                }}
                className="flex-1 py-3.5 rounded-full bg-[#282A2D] hover:bg-[#323538] text-[#E3E3E3] font-medium transition text-sm"
              >
                Hủy
              </button>
              <button
                onClick={handleVerifyAdmin}
                className="flex-1 py-3.5 rounded-full bg-[#A8C7FA] hover:bg-[#8AB4F8] text-[#052D49] font-medium transition text-sm"
              >
                Tiếp tục
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL QUẢN LÝ USER */}
      {showUserManager && (
        <div
          className="fixed inset-0 bg-[#131314]/90 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowUserManager(false)}
        >
          <div
            className="bg-[#1A1C1E] rounded-[32px] shadow-2xl w-[90vw] max-w-5xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 border-b border-[#282A2D] flex justify-between items-center">
              <h2 className="text-2xl font-normal text-[#E3E3E3]">
                Hồ sơ đã đăng ký ({registeredUsers.length})
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowChangePassModal(true)}
                  className="px-5 py-2.5 rounded-full bg-[#282A2D] text-[#A8C7FA] transition-all font-medium hover:bg-[#323538] text-sm"
                >
                  Đổi mật khẩu
                </button>
                <button
                  onClick={() => setShowUserManager(false)}
                  className="px-5 py-2.5 rounded-full bg-[#282A2D] hover:bg-[#323538] text-[#E3E3E3] transition-all font-medium text-sm"
                >
                  Đóng
                </button>
              </div>
            </div>
            <div className="p-8 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {registeredUsers.map((user, idx) => (
                  <div
                    key={idx}
                    className="bg-[#282A2D] rounded-[28px] p-4 flex flex-col items-center hover:bg-[#323538] transition-all group relative"
                  >
                    <button
                      onClick={() => handleDeleteUser(user.uid)}
                      className="absolute top-3 right-3 bg-[#1A1C1E] text-[#F2B8B5] hover:text-white hover:bg-[#5c1c1c] p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
                      title="Xóa hồ sơ và thẻ"
                    >
                      <FiTrash2 className="text-[15px]" />
                    </button>
                    <div className="w-full aspect-square rounded-[20px] overflow-hidden bg-[#131314] mb-4 relative">
                      <img
                        src={`${API_BASE_URL}/${user.image_url}`}
                        alt={user.uid}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.src =
                            "https://placehold.co/200x200/131314/C4C7C5?text=No+Face";
                        }}
                      />
                    </div>
                    <span className="text-[15px] font-medium text-[#E3E3E3]">
                      {user.uid}
                    </span>
                  </div>
                ))}
              </div>
              {registeredUsers.length === 0 && (
                <div className="text-center text-[#C4C7C5] py-16 rounded-[32px] bg-[#282A2D]">
                  Chưa có thành viên nào.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL ĐỔI MẬT KHẨU (Đã cập nhật giao diện Dark Theme) */}
      {showChangePassModal && (
        <div className="fixed inset-0 bg-[#131314]/90 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#1A1C1E] rounded-[32px] p-8 shadow-2xl w-full max-w-md border border-[#282A2D] flex flex-col">
            <h2 className="text-2xl font-normal mb-6 text-center text-[#E3E3E3]">
              Đổi mật khẩu
            </h2>

            <div className="flex bg-[#282A2D] p-1.5 rounded-full mb-8 relative">
              <button
                onClick={() => {
                  setPassTab("web");
                  setChangePassStatus({ type: "", message: "" });
                }}
                className={`flex-1 py-2.5 text-sm font-medium rounded-full transition-all duration-300 z-10 ${passTab === "web" ? "bg-[#1A1C1E] text-[#A8C7FA] shadow-sm" : "text-[#C4C7C5] hover:text-[#E3E3E3]"}`}
              >
                Mật khẩu Web
              </button>
              <button
                onClick={() => {
                  setPassTab("door");
                  setChangePassStatus({ type: "", message: "" });
                }}
                className={`flex-1 py-2.5 text-sm font-medium rounded-full transition-all duration-300 z-10 ${passTab === "door" ? "bg-[#1A1C1E] text-[#A8C7FA] shadow-sm" : "text-[#C4C7C5] hover:text-[#E3E3E3]"}`}
              >
                Mật khẩu Cửa
              </button>
            </div>

            {passTab === "web" ? (
              <div className="space-y-4 mb-6">
                <input
                  type="password"
                  placeholder="Mật khẩu cũ"
                  value={passwords.old}
                  onChange={(e) =>
                    setPasswords({ ...passwords, old: e.target.value })
                  }
                  className="w-full bg-[#282A2D] rounded-[20px] px-5 py-4 text-[#E3E3E3] outline-none focus:bg-[#323538] transition-colors"
                />
                <input
                  type="password"
                  placeholder="Mật khẩu mới"
                  value={passwords.new}
                  onChange={(e) =>
                    setPasswords({ ...passwords, new: e.target.value })
                  }
                  className="w-full bg-[#282A2D] rounded-[20px] px-5 py-4 text-[#E3E3E3] outline-none focus:bg-[#323538] transition-colors"
                />
                <input
                  type="password"
                  placeholder="Xác nhận mật khẩu mới"
                  value={passwords.confirm}
                  onChange={(e) =>
                    setPasswords({ ...passwords, confirm: e.target.value })
                  }
                  className="w-full bg-[#282A2D] rounded-[20px] px-5 py-4 text-[#E3E3E3] outline-none focus:bg-[#323538] transition-colors"
                />
              </div>
            ) : (
              <div className="space-y-4 mb-6">
                <p className="text-xs text-[#C4C7C5] text-center px-4 leading-relaxed">
                  Dùng để mở trên Keypad. Yêu cầu 4-16 ký tự. (Chỉ dùng phím số
                  và A, B, C, D)
                </p>
                <input
                  type="password"
                  placeholder="Mật khẩu cửa mới"
                  value={doorPasswords.new}
                  onChange={(e) =>
                    setDoorPasswords({ ...doorPasswords, new: e.target.value })
                  }
                  className="w-full bg-[#282A2D] rounded-[20px] px-5 py-4 text-[#A8C7FA] outline-none focus:bg-[#323538] transition-colors font-mono tracking-[0.3em] text-center text-lg"
                />
                <input
                  type="password"
                  placeholder="Xác nhận mật khẩu cửa"
                  value={doorPasswords.confirm}
                  onChange={(e) =>
                    setDoorPasswords({
                      ...doorPasswords,
                      confirm: e.target.value,
                    })
                  }
                  className="w-full bg-[#282A2D] rounded-[20px] px-5 py-4 text-[#A8C7FA] outline-none focus:bg-[#323538] transition-colors font-mono tracking-[0.3em] text-center text-lg"
                />
              </div>
            )}

            {changePassStatus.message && (
              <p
                className={`text-sm font-medium mb-6 text-center ${changePassStatus.type === "error" ? "text-[#F2B8B5]" : "text-[#C4EED0]"}`}
              >
                {changePassStatus.message}
              </p>
            )}

            <div className="flex gap-3 w-full">
              <button
                onClick={() => {
                  setShowChangePassModal(false);
                  setChangePassStatus({ type: "", message: "" });
                  setPassTab("web");
                }}
                className="flex-1 py-3.5 rounded-full bg-[#282A2D] hover:bg-[#323538] text-[#E3E3E3] font-medium transition text-sm"
              >
                Hủy
              </button>
              <button
                onClick={
                  passTab === "web"
                    ? handleChangePassword
                    : handleChangeDoorPassword
                }
                className="flex-1 py-3.5 rounded-full bg-[#A8C7FA] hover:bg-[#8AB4F8] text-[#052D49] font-medium transition text-sm"
              >
                Cập nhật
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CẤP MÃ OTP */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-[#131314]/90 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#1A1C1E] rounded-[32px] p-8 shadow-2xl w-full max-w-sm flex flex-col items-center text-center border border-[#282A2D]">
            <h2 className="text-2xl font-normal mb-2 text-[#E3E3E3]">
              Mã vào cửa tạm thời
            </h2>
            <p className="text-[15px] text-[#C4C7C5] mb-8">
              Hiệu lực 10 phút. Chỉ sử dụng 1 lần.
            </p>
            <div className="bg-[#282A2D] rounded-[24px] px-8 py-6 mb-8 w-full border border-[#323538]">
              <span className="text-4xl font-normal tracking-[0.2em] text-[#A8C7FA]">
                {currentOtp}
              </span>
            </div>
            <button
              onClick={() => setShowOtpModal(false)}
              className="w-full py-3.5 rounded-full bg-[#A8C7FA] hover:bg-[#8AB4F8] text-[#052D49] font-medium transition text-[15px]"
            >
              Hoàn tất
            </button>
          </div>
        </div>
      )}
      {/* Thêm ToastContainer vào dòng cuối cùng trước thẻ đóng </div> ngoài cùng */}
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark" // 👈 Cấu hình Dark Theme tự động khớp với UI của bạn
      />
    </div>
  );
}
