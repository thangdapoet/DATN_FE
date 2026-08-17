import { useState, useEffect } from "react";
import { getHistoryGroupedByDateAsync } from "../api/python";
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
  FiFilter, // Import thêm icon bộ lọc
} from "react-icons/fi";

export default function CameraDashboard() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserManager, setShowUserManager] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [pendingAction, setPendingAction] = useState("");

  const [historyByDate, setHistoryByDate] = useState({});
  const [selectedDate, setSelectedDate] = useState("");
  const [events, setEvents] = useState([]);
  const [albumOpen, setAlbumOpen] = useState(false);

  const [showFilter, setShowFilter] = useState(false);
  const [appliedEvents, setAppliedEvents] = useState([]);
  const [appliedUIDs, setAppliedUIDs] = useState([]);
  const [tempEvents, setTempEvents] = useState([]);
  const [tempUIDs, setTempUIDs] = useState([]);

  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [passwords, setPasswords] = useState({ old: "", new: "", confirm: "" });
  const [changePassStatus, setChangePassStatus] = useState({
    type: "",
    message: "",
  });
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [currentOtp, setCurrentOtp] = useState("");

  const API_BASE_URL = "http://192.168.1.13:8000";
  const WS_URL = "ws://192.168.1.13:8000/ws/events";

  // --- LOGIC XỬ LÝ BỘ LỌC ---
  // Các sự kiện cố định dựa trên backend
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

  const baseItems = historyByDate[selectedDate] || [];

  // Trích xuất UID động (chỉ lấy các UID xuất hiện trong ngày đang chọn)
  const uniqueUIDs = [...new Set(baseItems.map((h) => h.UID))]
    .filter(Boolean)
    .filter((uid) => uid !== "WEB_ADMIN" && uid !== "UNKNOWN");

  // Tính toán số kết quả sẽ hiển thị nếu bấm Áp dụng
  const tempFilteredCount = baseItems.filter((item) => {
    const matchEvent =
      tempEvents.length === 0 || tempEvents.includes(item.Status);
    const matchUID = tempUIDs.length === 0 || tempUIDs.includes(item.UID);
    return matchEvent && matchUID;
  }).length;

  // Dữ liệu thực tế được hiển thị trên UI
  const displayedItems = baseItems.filter((item) => {
    const matchEvent =
      appliedEvents.length === 0 || appliedEvents.includes(item.Status);
    const matchUID = appliedUIDs.length === 0 || appliedUIDs.includes(item.UID);
    return matchEvent && matchUID;
  });

  const toggleTempEvent = (id) => {
    setTempEvents((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id],
    );
  };

  const toggleTempUID = (uid) => {
    setTempUIDs((prev) =>
      prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid],
    );
  };

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

  // Các hàm API giữ nguyên
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

  const executeRemoteUnlock = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/remote-unlock`, { method: "POST" });
    } catch (err) {
      alert("Lỗi kết nối Server");
    }
  };

  const executeStopAlarm = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/remote-stop-alarm`, { method: "POST" });
    } catch (err) {
      alert("Lỗi kết nối Server");
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
      }
    } catch (err) {
      alert("Lỗi kết nối Server khi tạo OTP");
    }
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
          executeRemoteUnlock();
        } else if (pendingAction === "stopAlarm") {
          executeStopAlarm();
        }
        setPendingAction("");
      } else {
        setAuthError(data.message);
      }
    } catch (err) {
      setAuthError("Lỗi kết nối đến Server");
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users`);
      const data = await res.json();
      setRegisteredUsers(data.users);
    } catch (err) {
      console.error("Lỗi khi tải danh sách:", err);
    }
  };

  const handleDeleteUser = async (uid) => {
    const isConfirm = window.confirm(
      `CẢNH BÁO: Bạn có chắc chắn muốn xóa hồ sơ gương mặt và vô hiệu hóa thẻ RFID của người dùng [${uid}] không?\n\nHành động này không thể hoàn tác!`,
    );

    if (!isConfirm) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${uid}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.status === "success") {
        fetchUsers();
      } else {
        alert("Lỗi từ server: " + data.message);
      }
    } catch (err) {
      console.error("Lỗi khi gọi API xóa:", err);
      alert("Lỗi kết nối đến Server");
    }
  };

  const handleChangePassword = async () => {
    setChangePassStatus({ type: "", message: "" });

    if (passwords.new !== passwords.confirm) {
      setChangePassStatus({
        type: "error",
        message: "Mật khẩu xác nhận không khớp",
      });
      return;
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
      setChangePassStatus({ type: "error", message: "Lỗi kết nối đến Server" });
    }
  };

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
    } catch (error) {
      console.error("Lỗi khi tải lịch sử:", error);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    const socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      console.log("Đã kết nối WebSocket tới Server Python!");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Nhận sự kiện MQTT từ Backend:", data);

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

    socket.onerror = (err) => console.error("Lỗi WebSocket:", err);

    return () => socket.close();
  }, []);

  const sortedDates = Object.keys(historyByDate).sort(
    (a, b) => new Date(b) - new Date(a),
  );

  const getBadgeConfig = (status, uid) => {
    switch (status) {
      case "SPAM_WARNING":
        return {
          icon: <FiAlertCircle />,
          text: "Spam Thẻ",
          style:
            "bg-rose-500/10 text-rose-400 border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.3)]",
        };
      case "PASS_LOCKED":
        return {
          icon: <FiLock />,
          text: "Khóa Mật Khẩu",
          style:
            "bg-red-500/10 text-red-400 border-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.3)]",
        };
      case "RFID_LOCKED":
        return {
          icon: <FiCreditCard />,
          text: "Khóa Thẻ Từ",
          style:
            "bg-red-500/10 text-red-400 border-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.3)]",
        };
      case "FACE_LOCKED":
        return {
          icon: <FiUserX />,
          text: "Khóa Face ID",
          style:
            "bg-red-500/10 text-red-400 border-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.3)]",
        };
      case "CLONED_WARNING":
        return {
          icon: <FiAlertCircle />,
          text: "Thẻ Giả Mạo",
          style:
            "bg-rose-500/10 text-rose-400 border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.3)]",
        };
      case "FAKE_OR_STRANGER":
        return {
          icon: <FiUserX />,
          text: "Mặt không khớp",
          style: "bg-pink-500/10 text-pink-400 border-pink-500/30",
        };
      case "FACE_NOT_FOUND":
        return {
          icon: <FiAlertCircle />,
          text: "Không Thấy Mặt",
          style: "bg-orange-500/10 text-orange-400 border-orange-500/30",
        };
      case "NO_REGISTRATION_FACE":
        return {
          icon: <FiAlertCircle />,
          text: "Chưa Đăng Ký Mặt",
          style: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        };
      case "UNKNOWN_FACE":
        return {
          icon: <FiUserX />,
          text: "Người Lạ Quét Mặt",
          style: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
        };
      case "ADMIN_REGISTERED":
        return {
          icon: <FiUserCheck />,
          text: "Đăng Ký Mới",
          style:
            "bg-cyan-500/10 text-cyan-400 border-cyan-500/50 shadow-[0_0_8px_rgba(6,182,212,0.3)]",
        };
      case "SUCCESS":
        return {
          icon: <FiUserCheck />,
          text: "Hợp lệ",
          style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        };
      case "WEB_REMOTE_UNLOCK":
        return {
          icon: <FiLock />, // Hoặc icon Unlock nếu bạn đã import
          text: "Mở Cửa (Web)",
          style:
            "bg-emerald-500/10 text-emerald-400 border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.3)]",
        };
      case "WEB_STOPPED_ALARM":
        return {
          icon: <FiShield />,
          text: "Tắt Báo Động (Web)",
          style:
            "bg-yellow-500/10 text-yellow-400 border-yellow-500/50 shadow-[0_0_8px_rgba(234,179,8,0.3)]",
        };
      case "WEB_ADMIN_DELETED":
        return {
          icon: <FiTrash2 />,
          text: "Xóa Hồ Sơ (Web)",
          style: "bg-slate-500/10 text-slate-400 border-slate-500/50",
        };
      default:
        return {
          icon: <FiBarChart2 />,
          text: status,
          style: "bg-slate-700/50 text-slate-300 border-slate-600",
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6 text-white">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-semibold">SECURITY HUB</h1>
        <div className="flex gap-4">
          <button
            onClick={handleGenerateOTP}
            className="px-5 py-2 flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/50 transition rounded-xl font-medium"
          >
            Cấp mã OTP
          </button>
          <button
            onClick={handleStopAlarmClick}
            className="px-5 py-2 flex items-center gap-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 transition rounded-xl font-medium"
          >
            Tắt Báo Động
          </button>
          <button
            onClick={handleRemoteUnlockClick}
            className="px-5 py-2 flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 transition rounded-xl font-medium"
          >
            Mở Cửa
          </button>
          <button
            onClick={handleUserManagerClick}
            className="px-5 py-2 flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/50 transition rounded-xl font-medium"
          >
            Hồ Sơ
          </button>
          <button
            onClick={() => setAlbumOpen(true)}
            className="px-5 py-2 flex items-center gap-2 bg-rose-600 hover:bg-rose-500 transition rounded-xl shadow-[0_0_15px_rgba(225,29,72,0.4)] font-medium"
          >
            CẢNH BÁO BẢO MẬT
          </button>
        </div>
      </div>

      {/* DASHBOARD CAMERA */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 flex flex-col gap-6">
          <div className="bg-slate-800 rounded-2xl p-6 w-full border border-slate-700 border-t-[6px] border-t-cyan-500 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.7)] relative transition-all duration-300 hover:-translate-y-1">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
                <FiCamera className="text-cyan-400" /> Live Camera
              </h2>
              <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                <span className="text-red-400 text-sm font-bold tracking-widest uppercase">
                  Live
                </span>
              </div>
            </div>
            <div className="flex justify-center w-full">
              <div className="w-full max-w-[720px] bg-black rounded-2xl overflow-hidden border border-gray-700">
                <img
                  src={`${API_BASE_URL}/video_feed`}
                  alt="Live Stream"
                  className="w-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="xl:col-span-1 w-full flex flex-col gap-6">
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 border-t-[6px] border-t-cyan-500 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.7)] relative transition-all duration-300 hover:-translate-y-1">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <FiBarChart2 /> HOẠT ĐỘNG GẦN ĐÂY
            </h2>
            <div className="max-h-[380px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {events.length === 0 && (
                <div className="text-gray-500 italic text-center mt-6">
                  Hệ thống đang hoạt động. Chờ sự kiện...
                </div>
              )}
              {events.map((ev, i) => (
                <div
                  key={i}
                  className={`p-3 border rounded-xl shadow-inner flex flex-col gap-1.5 transition-all ${ev.status === "ok" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-rose-500/10 border-rose-500/30 text-rose-400"}`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-sm">{ev.message}</span>
                    <span className="text-xs opacity-70 whitespace-nowrap ml-2">
                      {ev.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL ALBUM BẢO MẬT & BỘ LỌC */}
      {albumOpen && (
        <div
          className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setAlbumOpen(false)}
        >
          <div
            className="bg-slate-800 rounded-2xl shadow-2xl w-[90vw] max-w-6xl max-h-[90vh] flex flex-col border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-700 flex justify-between items-center shrink-0">
              <h2 className="text-2xl font-semibold flex items-center gap-3 text-rose-400">
                <FiShield /> Nhật ký cảnh báo bảo mật
              </h2>
              <button
                onClick={() => setAlbumOpen(false)}
                className="px-5 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-all font-medium shadow-md border border-slate-600"
              >
                Đóng (Esc)
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              {/* THANH CÔNG CỤ: NGÀY & LỌC */}
              <div className="flex justify-between items-center mb-6 relative">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-300 font-medium">
                      Chọn ngày:
                    </span>
                    <select
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        // Khi đổi ngày có thể clear bộ lọc hoặc giữ nguyên, ở đây ta giữ nguyên state
                      }}
                      className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-sm outline-none focus:border-rose-500 text-rose-300 font-medium cursor-pointer"
                    >
                      {sortedDates.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={openFilterPanel}
                    className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${appliedEvents.length > 0 || appliedUIDs.length > 0 ? "border-cyan-500 text-cyan-400 bg-cyan-500/10" : "border-slate-600 text-slate-300 hover:bg-slate-700"}`}
                  >
                    <FiFilter /> Lọc{" "}
                    {(appliedEvents.length > 0 || appliedUIDs.length > 0) &&
                      `(${appliedEvents.length + appliedUIDs.length})`}
                  </button>
                </div>

                {/* PANEL BỘ LỌC (GIỐNG TGDĐ) */}
                {showFilter && (
                  <div className="absolute top-12 left-0 w-full max-w-2xl bg-slate-800 border border-slate-600 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 p-6 flex flex-col gap-6">
                    <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                      <h3 className="font-semibold text-lg text-white">
                        Tất cả bộ lọc
                      </h3>
                      <button
                        onClick={() => setShowFilter(false)}
                        className="text-slate-400 hover:text-white px-3 py-1 border border-slate-600 hover:border-slate-400 rounded transition-colors text-sm"
                      >
                        ✕ Đóng
                      </button>
                    </div>

                    <div className="flex flex-col gap-6 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
                      {/* Section Sự Kiện */}
                      <div>
                        <h4 className="text-slate-300 font-medium mb-3">
                          Loại sự kiện
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {fixedEvents.map((ev) => (
                            <button
                              key={ev.id}
                              onClick={() => toggleTempEvent(ev.id)}
                              className={`px-4 py-2 border rounded-md text-sm transition-colors ${tempEvents.includes(ev.id) ? "border-cyan-500 text-cyan-400 bg-cyan-500/10" : "border-slate-600 text-slate-400 hover:border-slate-500 bg-slate-900/50"}`}
                            >
                              {ev.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Section UID (Hiển thị động) */}
                      {uniqueUIDs.length > 0 && (
                        <div>
                          <h4 className="text-slate-300 font-medium mb-3">
                            UID Thẻ
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {uniqueUIDs.map((uid) => (
                              <button
                                key={uid}
                                onClick={() => toggleTempUID(uid)}
                                className={`px-4 py-2 border rounded-md text-sm transition-colors ${tempUIDs.includes(uid) ? "border-cyan-500 text-cyan-400 bg-cyan-500/10" : "border-slate-600 text-slate-400 hover:border-slate-500 bg-slate-900/50"}`}
                              >
                                {uid}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-center gap-4 border-t border-slate-700 pt-4 mt-2">
                      <button
                        onClick={handleClearFilter}
                        className="px-6 py-2 border border-rose-500 text-rose-500 hover:bg-rose-500/10 rounded-md transition font-medium"
                      >
                        Bỏ chọn
                      </button>
                      <button
                        onClick={handleApplyFilter}
                        className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md transition font-medium shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                      >
                        Xem {tempFilteredCount} kết quả
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* LƯỚI HIỂN THỊ KẾT QUẢ ĐÃ ĐƯỢC LỌC */}
              {selectedDate && displayedItems.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {displayedItems.map((h) => (
                    <div
                      key={h.HistoryId}
                      className="p-3 bg-slate-900 rounded-xl border border-slate-700 flex flex-col justify-between hover:border-slate-500 transition-colors group"
                    >
                      <div>
                        <div className="overflow-hidden rounded-lg mb-3 border border-slate-700">
                          <img
                            src={`${API_BASE_URL}/${h.ImageUrl}`}
                            alt="Face Capture"
                            className="w-full h-28 object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.target.src =
                                "https://placehold.co/150x150/1e293b/f43f5e?text=No+Image";
                            }}
                          />
                        </div>
                        <div className="text-sm text-gray-400">
                          ID:{" "}
                          <span className="text-white font-bold">{h.UID}</span>
                        </div>
                        <div className="mt-2 flex">
                          {(() => {
                            const badge = getBadgeConfig(h.Status, h.UID);
                            return (
                              <div
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md border ${badge.style}`}
                              >
                                {badge.icon}
                                <span className="truncate">{badge.text}</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="text-xs font-mono text-slate-500 mt-3 text-right border-t border-slate-800 pt-2">
                        {new Date(h.CreatedDate).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-400 mt-8 text-center bg-slate-900/50 py-12 rounded-xl border border-slate-800 border-dashed">
                  Không tìm thấy cảnh báo nào phù hợp với bộ lọc trong ngày này.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Các modal khác (Xác thực, Quản lý User, Đổi mật khẩu) giữ nguyên không thay đổi... */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-2xl p-8 shadow-2xl w-full max-w-md border border-slate-700 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-cyan-500/50 flex items-center justify-center mb-4">
              <FiLock className="text-3xl text-cyan-400" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Xác thực</h2>
            <input
              type="password"
              placeholder="Nhập mật khẩu..."
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyAdmin()}
              className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500 mb-2 transition-colors text-center tracking-widest"
              autoFocus
            />
            {authError && (
              <p className="text-rose-400 text-sm font-medium mb-4">
                {authError}
              </p>
            )}
            <div className="flex gap-3 w-full mt-4">
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  setAuthError("");
                }}
                className="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 font-medium transition"
              >
                Hủy
              </button>
              <button
                onClick={handleVerifyAdmin}
                className="flex-1 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-medium transition shadow-[0_0_15px_rgba(6,182,212,0.4)]"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {showUserManager && (
        <div
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowUserManager(false)}
        >
          <div
            className="bg-slate-800 rounded-2xl shadow-2xl w-[90vw] max-w-5xl max-h-[85vh] flex flex-col border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-2xl font-semibold flex items-center gap-3 text-cyan-400">
                Hồ sơ đã đăng ký ({registeredUsers.length})
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowChangePassModal(true)}
                  className="px-5 py-2 rounded-lg bg-slate-700 hover:bg-cyan-600 text-white transition-all font-medium border border-slate-600 hover:border-cyan-500"
                >
                  Đổi mật khẩu
                </button>
                <button
                  onClick={() => setShowUserManager(false)}
                  className="px-5 py-2 rounded-lg bg-slate-700 hover:bg-rose-500 transition-all font-medium"
                >
                  Đóng
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {registeredUsers.map((user, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-900 rounded-xl border border-slate-700 p-3 flex flex-col items-center hover:border-cyan-500 transition-colors group relative"
                  >
                    <button
                      onClick={() => handleDeleteUser(user.uid)}
                      className="absolute top-2 right-2 bg-red-600/90 hover:bg-red-500 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10 shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                      title="Xóa hồ sơ và thẻ"
                    >
                      <FiTrash2 className="text-lg" />
                    </button>
                    <div className="w-full aspect-square rounded-lg overflow-hidden border border-slate-800 mb-3 relative">
                      <img
                        src={`${API_BASE_URL}/${user.image_url}`}
                        alt={user.uid}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => {
                          e.target.src =
                            "https://placehold.co/200x200/1e293b/06b6d4?text=No+Face";
                        }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
                      UID
                    </span>
                    <span className="text-lg font-bold text-white tracking-wider">
                      {user.uid}
                    </span>
                  </div>
                ))}
              </div>
              {registeredUsers.length === 0 && (
                <div className="text-center text-slate-400 py-12 border border-slate-700 border-dashed rounded-xl bg-slate-900/50">
                  Không có dữ liệu khuôn mặt nào được đăng ký.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showChangePassModal && (
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-2xl p-8 shadow-2xl w-full max-w-md border border-slate-700 flex flex-col">
            <h2 className="text-2xl font-semibold mb-6 text-center text-cyan-400">
              Đổi mật khẩu
            </h2>
            <input
              type="password"
              placeholder="Mật khẩu cũ"
              value={passwords.old}
              onChange={(e) =>
                setPasswords({ ...passwords, old: e.target.value })
              }
              className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500 mb-4 transition-colors"
            />
            <input
              type="password"
              placeholder="Mật khẩu mới"
              value={passwords.new}
              onChange={(e) =>
                setPasswords({ ...passwords, new: e.target.value })
              }
              className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500 mb-4 transition-colors"
            />
            <input
              type="password"
              placeholder="Xác nhận mật khẩu mới"
              value={passwords.confirm}
              onChange={(e) =>
                setPasswords({ ...passwords, confirm: e.target.value })
              }
              className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500 mb-4 transition-colors"
            />
            {changePassStatus.message && (
              <p
                className={`text-sm font-medium mb-4 text-center ${changePassStatus.type === "error" ? "text-rose-400" : "text-emerald-400"}`}
              >
                {changePassStatus.message}
              </p>
            )}
            <div className="flex gap-3 w-full mt-2">
              <button
                onClick={() => {
                  setShowChangePassModal(false);
                  setChangePassStatus({ type: "", message: "" });
                }}
                className="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 font-medium transition"
              >
                Hủy
              </button>
              <button
                onClick={handleChangePassword}
                className="flex-1 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-medium transition shadow-[0_0_15px_rgba(6,182,212,0.4)]"
              >
                Cập nhật
              </button>
            </div>
          </div>
        </div>
      )}
      {showOtpModal && (
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-2xl p-8 shadow-2xl w-full max-w-sm border border-slate-700 flex flex-col items-center text-center">
            <h2 className="text-xl font-semibold mb-2 text-blue-400">Mã OTP</h2>
            <p className="text-sm text-slate-400 mb-6">
              Mã này có hiệu lực 10 phút và chỉ dùng được 1 lần duy nhất.
            </p>

            <div className="bg-slate-900 border border-blue-500/30 rounded-xl px-8 py-4 mb-6 shadow-inner">
              <span className="text-4xl font-mono font-bold tracking-[0.25em] text-white">
                {currentOtp}
              </span>
            </div>

            <button
              onClick={() => setShowOtpModal(false)}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition shadow-lg"
            >
              Đã Xong
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
