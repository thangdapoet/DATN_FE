import { useState, useEffect } from "react";
import { FiZap, FiCamera, FiImage, FiBarChart2 } from "react-icons/fi";
import { MdBrightness6 } from "react-icons/md";
import { getHistoryGroupedByDateAsync } from "../api/python";

export default function CameraDashboard() {
  const [flash, setFlash] = useState(false);
  const [brightness, setBrightness] = useState(0);
  const [saturation, setSaturation] = useState(0);

  const [historyByDate, setHistoryByDate] = useState({});
  const [selectedDate, setSelectedDate] = useState("");

  const [events, setEvents] = useState([]);
  const [albumOpen, setAlbumOpen] = useState(false);

  // Thay bằng IP máy tính của bạn nếu chạy trên điện thoại/máy khác
  const API_BASE_URL = "http://192.168.1.10:8000";
  const WS_URL = "ws://192.168.1.10:8000/ws/events";

  // Hàm load dữ liệu lịch sử từ Backend
  async function loadHistory() {
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
  }

  // Chạy lần đầu khi mở trang
  useEffect(() => {
    loadHistory();
  }, []);

  // 🔴 LẮNG NGHE SỰ KIỆN TỪ WEBSOCKET (THAY THẾ POLLING)
  useEffect(() => {
    const socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      console.log("🟢 Đã kết nối WebSocket tới Server Python!");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("🔔 Nhận sự kiện MQTT từ Backend:", data);

      // Thêm sự kiện mới vào danh sách log (đưa lên đầu)
      setEvents((prevEvents) => [data, ...prevEvents]);

      // Khi có người quẹt thẻ, Python đã lưu DB xong -> Báo FE load lại lịch sử
      loadHistory();
    };

    socket.onerror = (err) => console.error("Lỗi WebSocket:", err);

    return () => {
      socket.close(); // Dọn dẹp kết nối khi đóng tab
    };
  }, []);

  // Các hàm điều khiển phần cứng tạm thời vô hiệu hóa / hoặc bạn tự map qua MQTT sau
  const handleFlashToggle = () => setFlash(!flash);
  const updateBrightness = (v) => setBrightness(v);
  const updateSaturation = (v) => setSaturation(v);

  // Xử lý hiển thị danh sách ngày
  const sortedDates = Object.keys(historyByDate).sort(
    (a, b) => new Date(b) - new Date(a),
  );

  const selectedItems =
    selectedDate && historyByDate[selectedDate]
      ? historyByDate[selectedDate]
      : [];

  return (
    <div className="min-h-screen bg-[#1b1b24] p-6 text-white">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-semibold">Smart Cam Dashboard</h1>

        <button
          onClick={() => setAlbumOpen(true)}
          className="px-5 py-2 flex items-center gap-2 bg-purple-600 hover:bg-purple-500 transition rounded-xl shadow-lg"
        >
          <FiImage className="text-xl" />
          Xem Lịch Sử
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* LEFT SIDE */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          {/* CAMERA */}
          <div className="bg-[#262631] rounded-2xl p-6 shadow-xl w-full">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <FiCamera /> Live Camera
              </h2>
              <span className="text-red-400 text-sm font-semibold">● Live</span>
            </div>

            <div className="flex justify-center w-full">
              <div className="w-full max-w-[720px] bg-black rounded-2xl overflow-hidden border border-gray-700">
                {/* ĐÃ ĐỔI LUỒNG STREAM SANG API CỦA FASTAPI */}
                <img
                  src={`${API_BASE_URL}/video_feed`}
                  alt="Live Stream"
                  className="w-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="xl:col-span-1 w-full flex flex-col gap-6">
          {/* EVENT LOG */}
          <div className="bg-[#262631] rounded-2xl p-6 shadow-xl">
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
                  className="p-3 bg-[#1e1e27] border border-gray-700 rounded-xl text-gray-300 shadow-inner"
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

      {/* POPUP: History */}
      {albumOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-[#262631] rounded-2xl shadow-2xl p-6 w-[90vw] max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <FiBarChart2 /> Lịch Sử Truy Cập
              </h2>
              <button
                onClick={() => setAlbumOpen(false)}
                className="px-4 py-1 rounded-lg bg-gray-700 hover:bg-gray-600"
              >
                Close
              </button>
            </div>

            {/* Date select box */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-gray-300">Chọn Ngày:</span>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-[#1e1e27] border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500"
              >
                {sortedDates.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* History list for selected date */}
            {selectedDate && selectedItems.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {selectedItems.map((h) => (
                  <div
                    key={h.HistoryId}
                    className="p-3 bg-[#1e1e27] rounded-xl border border-gray-700 flex flex-col justify-between"
                  >
                    <div>
                      {/* ĐẢM BẢO ẢNH LOAD ĐÚNG TỪ THƯ MỤC UPLOADS CỦA FASTAPI */}
                      <img
                        src={`${API_BASE_URL}/${h.ImageUrl}`}
                        alt="Face Capture"
                        className="w-full h-28 rounded-lg mb-3 object-cover border border-gray-600"
                        onError={(e) => {
                          e.target.src =
                            "https://placehold.co/150x150?text=No+Image";
                        }}
                      />
                      <div className="text-sm text-gray-300">
                        <b>ID:</b>{" "}
                        <span className="text-purple-300">{h.UID}</span>
                      </div>
                      <div className="text-sm text-gray-300 truncate">
                        <b>Status:</b> {h.Status}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2 text-right">
                      {new Date(h.CreatedDate).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-400 mt-4 text-center">
                Không có lịch sử truy cập trong ngày này.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
