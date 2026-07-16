import { useState, useEffect } from "react";
import { getHistoryGroupedByDateAsync } from "../api/python";
import {
  FiCamera,
  FiImage,
  FiBarChart2,
  FiAlertCircle,
  FiUserCheck,
  FiUserX,
  FiCreditCard,
  FiLock,
} from "react-icons/fi";

export default function CameraDashboard() {
  const [historyByDate, setHistoryByDate] = useState({});
  const [selectedDate, setSelectedDate] = useState("");
  const [events, setEvents] = useState([]);
  const [albumOpen, setAlbumOpen] = useState(false);

  const API_BASE_URL = "http://192.168.1.10:8000";
  const WS_URL = "ws://192.168.1.10:8000/ws/events";

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
      console.log("🟢 Đã kết nối WebSocket tới Server Python!");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("🔔 Nhận sự kiện MQTT từ Backend:", data);

      setEvents((prevEvents) => [data, ...prevEvents]);
      loadHistory();
    };

    socket.onerror = (err) => console.error("Lỗi WebSocket:", err);

    return () => socket.close();
  }, []);

  const sortedDates = Object.keys(historyByDate).sort(
    (a, b) => new Date(b) - new Date(a),
  );

  const selectedItems = historyByDate[selectedDate] || [];
  const getBadgeConfig = (status, uid) => {
    switch (status) {
      // 1. Nhóm Khóa Hệ Thống (Sai quá 5 lần)
      case "PASS_LOCKED":
        return {
          icon: <FiLock />,
          text: "Khóa Mật Khẩu",
          style: "bg-red-500/10 text-red-400 border-red-500/30",
        };
      case "RFID_LOCKED":
        return {
          icon: <FiCreditCard />,
          text: "Khóa Thẻ Từ",
          style: "bg-red-500/10 text-red-400 border-red-500/30",
        };

      // 2. Nhóm Thành Công (Hợp lệ)
      case "SUCCESS":
        return {
          icon: <FiUserCheck />,
          text: "Khuôn mặt trùng khớp",
          style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        };

      // 3. Nhóm Quẹt Thẻ Hợp Lệ Nhưng Lỗi Khuôn Mặt
      case "FAKE_OR_STRANGER":
        return {
          icon: <FiUserX />,
          text: "Khuôn mặt không khớp",
          style: "bg-pink-500/10 text-pink-400 border-pink-500/30",
        };
      case "FACE_NOT_FOUND":
        return {
          icon: <FiAlertCircle />,
          text: "Không Thấy Khuôn Mặt",
          style: "bg-pink-500/10 text-pink-400 border-pink-500/30",
        };
      case "NO_REGISTRATION_FACE":
        return {
          icon: <FiAlertCircle />,
          text: "Chưa Đăng Ký Mặt",
          style: "bg-pink-500/10 text-pink-400 border-pink-500/30",
        };

      // 4. Nhóm Bấm Nút # Nhận Diện Người Lạ
      case "UNKNOWN_FACE":
        return {
          icon: <FiUserX />,
          text: "Người Lạ Quét Mặt",
          style: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        };

      // Mặc định cho các trường hợp khác
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
        <h1 className="text-3xl font-semibold">Smart Cam Dashboard</h1>

        <button
          onClick={() => setAlbumOpen(true)}
          className="px-5 py-2 flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 transition rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.5)]"
        >
          <FiImage className="text-xl" />
          Xem Lịch Sử
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 flex flex-col gap-6">
          <div className="bg-slate-800 rounded-2xl p-6 w-full border border-slate-700 border-t-[6px] border-t-cyan-500 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.7)] relative transition-all duration-300 hover:-translate-y-1">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
                <FiCamera className="text-cyan-400" /> Live Camera
              </h2>
              {/* Badge LIVE có hiệu ứng nhấp nháy */}
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
              <FiBarChart2 /> Lịch sử sự kiện (Real-Time)
            </h2>

            <div className="max-h-56 overflow-y-auto space-y-3 pr-1">
              {events.length === 0 && (
                <div className="text-gray-500 italic">Đang chờ sự kiện...</div>
              )}
              {events.map((ev, i) => (
                <div
                  key={i}
                  className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-gray-300 shadow-inner"
                >
                  {ev.status === "ok" ? (
                    <div className="text-green-400 font-medium">
                      {ev.message}
                    </div>
                  ) : (
                    <div className="text-red-400 font-medium">{ev.message}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {albumOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() =>
            setAlbumOpen(false)
          } /* CHIÊU 1: Đóng khi click vào màn đen */
        >
          <div
            className="bg-slate-800 rounded-2xl shadow-2xl w-[90vw] max-w-6xl max-h-[90vh] flex flex-col border border-slate-700"
            onClick={(e) =>
              e.stopPropagation()
            } /* Ngăn không cho click bên trong bị lan ra ngoài */
          >
            {/* CHIÊU 2: Header cố định không cuộn */}
            <div className="p-6 border-b border-slate-700 flex justify-between items-center shrink-0">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-cyan-400">
                <FiBarChart2 /> Lịch Sử Truy Cập
              </h2>
              <button
                onClick={() => setAlbumOpen(false)}
                className="px-5 py-2 rounded-lg bg-slate-700 hover:bg-red-500 hover:text-white transition-all font-medium shadow-md"
              >
                Đóng (Esc)
              </button>
            </div>

            {/* Vùng nội dung có thể cuộn */}
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-2 mb-6">
                <span className="text-sm text-gray-300 font-medium">
                  Chọn Ngày:
                </span>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-sm outline-none focus:border-cyan-500 text-cyan-300 font-medium cursor-pointer"
                >
                  {sortedDates.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {selectedDate && selectedItems.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {selectedItems.map((h) => (
                    <div
                      key={h.HistoryId}
                      className="p-3 bg-slate-900 rounded-xl border border-slate-700 flex flex-col justify-between hover:border-cyan-500 transition-colors"
                    >
                      <div>
                        <img
                          src={`${API_BASE_URL}/${h.ImageUrl}`}
                          alt="Face Capture"
                          className="w-full h-28 rounded-lg mb-3 object-cover border border-slate-700"
                          onError={(e) => {
                            e.target.src =
                              "https://placehold.co/150x150/1e293b/06b6d4?text=No+Image";
                          }}
                        />
                        <div className="text-sm text-gray-400">
                          ID:{" "}
                          <span className="text-cyan-400 font-bold">
                            {h.UID}
                          </span>
                        </div>
                        {/* Render Badge Trạng Thái */}
                        <div className="mt-2 flex">
                          {(() => {
                            const badge = getBadgeConfig(h.Status, h.UID);
                            return (
                              <div
                                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border ${badge.style}`}
                              >
                                {badge.icon}
                                <span className="truncate">{badge.text}</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 mt-3 text-right border-t border-slate-800 pt-2">
                        {new Date(h.CreatedDate).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-400 mt-8 text-center bg-slate-900/50 py-10 rounded-xl border border-slate-800 dashed">
                  Không có dữ liệu lịch sử truy cập.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
