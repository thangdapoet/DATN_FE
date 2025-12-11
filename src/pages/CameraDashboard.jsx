import { useState, useEffect } from "react";
import { ESP } from "../api/esp32";
import { FiZap, FiCamera, FiImage, FiBarChart2 } from "react-icons/fi";
import { MdBrightness6 } from "react-icons/md";
import {
  getHistoryGroupedByDateAsync,
  uploadHistoryImageAsync,
  createHistoryAsync,
} from "../api/python";

export default function CameraDashboard() {
  const [flash, setFlash] = useState(false);
  const [brightness, setBrightness] = useState(0);
  const [saturation, setSaturation] = useState(0);

  const [historyByDate, setHistoryByDate] = useState({});
  const [selectedDate, setSelectedDate] = useState("");

  const [events, setEvents] = useState([]);
  const [albumOpen, setAlbumOpen] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [lastSeq, setLastSeq] = useState(0);

  async function loadHistory() {
    // API returns grouped-by-date object: { "2025-12-02": [ ...items ], ... }
    const data = await getHistoryGroupedByDateAsync();
    setHistoryByDate(data);

    // pick newest date as default
    const dates = Object.keys(data);
    if (dates.length > 0) {
      const newest = dates.sort((a, b) => new Date(b) - new Date(a))[0];
      setSelectedDate(newest);
    } else {
      setSelectedDate("");
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadState() {
    try {
      const res = await fetch(ESP.state());
      const json = await res.json();
      setFlash(json.flashState);
      setBrightness(json.brightness);
      setSaturation(json.saturation);
    } catch {
      console.warn("Cannot connect to ESP32-CAM");
    }
  }

  async function handleFlashToggle() {
    await fetch(ESP.toggleFlash(), { method: "POST" });
    loadState();
  }

  async function updateBrightness(v) {
    setBrightness(v);
    await fetch(ESP.setBrightness(v));
  }

  async function updateSaturation(v) {
    setSaturation(v);
    await fetch(ESP.setSaturation(v));
  }

  async function handleNewEvent({ seq, status, id }) {
    const imageRes = await fetch(ESP.photo(seq));
    const blob = await imageRes.blob();

    const uploadRes = await uploadHistoryImageAsync(blob);
    const imageUrl = uploadRes.image_url;

    await createHistoryAsync({
      image_url: imageUrl,
      uid: id || "UNKNOWN",
      status: status,
    });

    await loadHistory();
  }

  // ✅ NEW: fetch lastEvent once at start to init lastSeq
  async function initLastSeq() {
    try {
      const res = await fetch(ESP.lastEvent());
      const json = await res.json();

      if (json.seq > 0) {
        setLastSeq(json.seq);
      }
    } catch (err) {
      console.warn("Init lastSeq failed", err);
    }
  }

  // 🔥 AUTO EVENT POLLING
  useEffect(() => {
    let intervalId;

    async function startPolling() {
      // first, load current last seq so we don't re-handle old event
      await initLastSeq();

      intervalId = setInterval(async () => {
        try {
          const res = await fetch(ESP.lastEvent());
          const json = await res.json();

          setLastSeq((prevSeq) => {
            // only handle if it's a new seq
            if (json.seq > 0 && json.seq !== prevSeq) {
              setEvents((prevEvents) => [...prevEvents, json]);
              // fire-and-forget; we don't await inside setState
              handleNewEvent(json);
              return json.seq;
            }
            return prevSeq;
          });
        } catch (err) {
          console.warn("Polling error", err);
        }
      }, 800);
    }

    startPolling();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  async function loadAlbum() {
    const res = await fetch(ESP.photoList());
    const arr = await res.json();
    setPhotos(arr);
  }

  useEffect(() => {
    if (albumOpen) loadAlbum();
  }, [albumOpen]);

  // sorted date list for the select box
  const sortedDates = Object.keys(historyByDate).sort(
    (a, b) => new Date(b) - new Date(a)
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
          Open Album
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
              <div className="w-full max-w-[720px] bg-black rounded-2xl overflow-hidden">
                <img src={ESP.stream} className="w-full object-contain" />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="xl:col-span-1 w-full flex flex-col gap-6">
          {/* CAMERA CONTROLS */}
          <div className="bg-[#262631] rounded-2xl p-6 shadow-xl w-full">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <FiZap /> Camera Controls
            </h2>

            {/* FLASH */}
            <div className="flex justify-between items-center mb-8">
              <span className="text-lg">Flash</span>
              <button
                onClick={handleFlashToggle}
                className={`px-6 py-2 rounded-xl shadow-md transition ${
                  flash ? "bg-yellow-500 text-black" : "bg-gray-700"
                }`}
              >
                {flash ? "ON" : "OFF"}
              </button>
            </div>

            {/* BRIGHTNESS */}
            <div className="mb-8">
              <div className="flex justify-between mb-2">
                <span className="font-medium">Brightness</span>
                <MdBrightness6 className="text-xl" />
              </div>
              <input
                type="range"
                min="-2"
                max="2"
                value={brightness}
                onChange={(e) => updateBrightness(Number(e.target.value))}
                className="w-full accent-purple-500"
              />
            </div>

            {/* SATURATION */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="font-medium">Saturation</span>
              </div>
              <input
                type="range"
                min="-2"
                max="2"
                value={saturation}
                onChange={(e) => updateSaturation(Number(e.target.value))}
                className="w-full accent-purple-500"
              />
            </div>
          </div>

          {/* EVENT LOG */}
          <div className="bg-[#262631] rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <FiBarChart2 /> Event Log (Real-Time)
            </h2>

            <div className="max-h-56 overflow-y-auto space-y-3 pr-1">
              {events.map((ev, i) => (
                <div
                  key={i}
                  className="p-3 bg-[#1e1e27] border border-gray-700 rounded-xl text-gray-300 shadow-inner"
                >
                  {ev.status === "ok" && ev.id && (
                    <div>
                      {i + 1}. {ev.id} đã vào
                    </div>
                  )}

                  {ev.status === "bad" && (
                    <div>{i + 1}. Phát hiện người lạ</div>
                  )}

                  {ev.status !== "ok" && ev.status !== "bad" && (
                    <div>
                      {i + 1}. Status: {ev.status}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* POPUP: Album + History */}
      {albumOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-[#262631] rounded-2xl shadow-2xl p-6 w-[90vw] max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <FiImage /> Album &amp; History
              </h2>
              <button
                onClick={() => setAlbumOpen(false)}
                className="px-4 py-1 rounded-lg bg-gray-700 hover:bg-gray-600"
              >
                Close
              </button>
            </div>

            {/* Album grid */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Album</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {photos.map((seq, i) => (
                  <img
                    key={i}
                    src={ESP.photo(seq)}
                    className="rounded-xl shadow-md object-cover h-28 w-full border border-gray-700"
                  />
                ))}
              </div>
            </div>

            {/* History in popup */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FiBarChart2 /> History
                </h3>

                {/* Date select box */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-300">Date:</span>
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-[#1e1e27] border border-gray-600 rounded-lg px-2 py-1 text-sm"
                  >
                    {sortedDates.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* History list for selected date */}
              {selectedDate && selectedItems.length > 0 ? (
                <div className="bg-[#1e1e27] p-4 rounded-xl border border-gray-700">
                  <h4 className="text-lg text-purple-300 font-semibold mb-2">
                    {selectedDate}
                  </h4>

                  {selectedItems.map((h) => (
                    <div
                      key={h.HistoryId}
                      className="p-2 bg-[#2d2d38] rounded-lg text-sm text-gray-300 mb-2"
                    >
                      <div>
                        <b>ID:</b> {h.UID}
                      </div>
                      <div>
                        <b>Status:</b> {h.Status}
                      </div>
                      <div>
                        <b>Time:</b> {new Date(h.CreatedDate).toLocaleString()}
                      </div>

                      <img
                        src={h.ImageUrl}
                        className="w-32 h-20 rounded-lg mt-2 border border-gray-600 object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400 mt-4">
                  No history for this date.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
