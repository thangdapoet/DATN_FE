import { useState, useEffect } from "react";
import { ESP } from "../api/esp32";
import { FiZap, FiCamera, FiImage, FiBarChart2 } from "react-icons/fi";
import { MdBrightness6 } from "react-icons/md";
import { 
  getHistoryGroupedByDateAsync,
  uploadHistoryImageAsync,
  createHistoryAsync
} from "../api/python";

export default function CameraDashboard() {
  const [flash, setFlash] = useState(false);
  const [brightness, setBrightness] = useState(0);
  const [saturation, setSaturation] = useState(0);

  const [events, setEvents] = useState([]);
  const [albumOpen, setAlbumOpen] = useState(false);
  const [photos, setPhotos] = useState([]);

  const [history, setHistory] = useState({});

  async function loadHistory() {
    const data = await getHistoryGroupedByDateAsync();
    setHistory(data);
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

  async function handleNotify(status, id) {
    try {
      await fetch(ESP.notify(status, id), { method: "POST" });
      console.log("Notify sent:", status, id);
    } catch (e) {
      console.error("Notify failed", e);
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

  // ============================================================
// 🚀 REAL TEST BUTTON — force ESP to capture & save history
// ============================================================
async function testCaptureFlow() {
  try {
    console.log("📸 Triggering ESP32 to capture image...");

    // 1️⃣ Tell ESP to capture & save image
    await fetch(ESP.notify("ok", "TEST123"), { method: "GET" });

    // 2️⃣ Give ESP time to save into SPIFFS (important!)
    await new Promise((r) => setTimeout(r, 500));

    // 3️⃣ Now fetch the newest event
    const evRes = await fetch(ESP.lastEvent());
    const event = await evRes.json();

    console.log("📩 Capture event:", event);

    if (!event.seq) {
      alert("❌ No event/seq found. ESP did not capture image.");
      return;
    }

    const { seq, id, status } = event;

    // 4️⃣ Fetch the image from ESP SPIFFS
    const imgRes = await fetch(ESP.photo(seq));
    const blob = await imgRes.blob();

    console.log("📸 Downloaded image from ESP");

    // 5️⃣ Upload to FastAPI
    const upload = await uploadHistoryImageAsync(blob);
    const imageUrl = upload.image_url;

    console.log("⬆ Uploaded to FastAPI:", imageUrl);

    // 6️⃣ Save DB record
    await createHistoryAsync({
      image_url: imageUrl,
      uid: id || "TEST123",
      status: status,
    });

    console.log("💾 Saved to History DB");

    // 7️⃣ Reload UI
    await loadHistory();

    alert("✔ ESP Capture + Upload + DB Save SUCCESS!");

  } catch (err) {
    console.error("❌ Test flow failed:", err);
    alert("Error testing capture. Check console.");
  }
}

  // ============================================================
  // 🔄 MANUAL TEST BUTTON — trigger last_event immediately
  // ============================================================
  async function testLastEvent() {
    try {
      console.log("🔍 Checking last event...");
      const res = await fetch(ESP.lastEvent());
      const json = await res.json();

      console.log("📩 last_event result:", json);

      if (!json.seq) {
        alert("No event available yet!");
        return;
      }

      const { seq, status, id } = json;

      // 1️⃣ Fetch image
      const imageRes = await fetch(ESP.photo(seq));
      const blob = await imageRes.blob();

      // 2️⃣ Upload image
      const uploadRes = await uploadHistoryImageAsync(blob);
      const imageUrl = uploadRes.image_url;

      // 3️⃣ Save History to DB
      await createHistoryAsync({
        image_url: imageUrl,
        uid: id || "UNKNOWN",
        status: status,
      });

      console.log("💾 History saved manually");
      await loadHistory();

      alert("✔ Manual Event Saved To History!");

    } catch (err) {
      console.error("Manual test error:", err);
      alert("Error testing last event. Check console.");
    }
  }

  // ============================================================
  // 🔥 AUTO EVENT POLLING
  // ============================================================
  useEffect(() => {
    loadState();

    const interval = setInterval(async () => {
      try {
        const res = await fetch(ESP.lastEvent());
        const json = await res.json();

        const isNew =
          json.seq &&
          (!events.length || json.seq !== events[events.length - 1].seq);

        if (isNew) {
          setEvents((prev) => [...prev, json]);

          console.log("🔔 New Event Detected:", json);

          const { seq, status, id } = json;

          // 1️⃣ Fetch image
          const imageRes = await fetch(ESP.photo(seq));
          const blob = await imageRes.blob();

          // 2️⃣ Upload image
          const uploadRes = await uploadHistoryImageAsync(blob);
          const imageUrl = uploadRes.image_url;

          // 3️⃣ Create DB entry
          await createHistoryAsync({
            image_url: imageUrl,
            uid: id || "UNKNOWN",
            status: status,
          });

          console.log("💾 Auto History saved!");
          await loadHistory();
        }
      } catch (err) {
        console.warn("Event poll error:", err);
      }
    }, 800);

    return () => clearInterval(interval);
  }, [events]);

  async function loadAlbum() {
    const res = await fetch(ESP.photoList());
    const arr = await res.json();
    setPhotos(arr);
  }

  useEffect(() => {
    if (albumOpen) loadAlbum();
  }, [albumOpen]);

  return (
    <div className="min-h-screen bg-[#1b1b24] p-6 text-white">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-semibold">Smart Cam Dashboard</h1>

        <button
          onClick={() => setAlbumOpen(!albumOpen)}
          className="px-5 py-2 flex items-center gap-2 bg-purple-600 hover:bg-purple-500 transition rounded-xl shadow-lg"
        >
          <FiImage className="text-xl" />
          {albumOpen ? "Hide Album" : "Open Album"}
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
        <img 
          src={ESP.stream}
          className="w-full object-contain"
        />
      </div>
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
              <div>{i + 1}. {ev.id} đã vào</div>
            )}

            {ev.status === "bad" && (
              <div>{i + 1}. Phát hiện người lạ</div>
            )}

            {ev.status !== "ok" && ev.status !== "bad" && (
              <div>{i + 1}. Status: {ev.status}</div>
            )}
          </div>
        ))}
      </div>
    </div>

    {/* HISTORY */}
    <div className="bg-[#262631] rounded-2xl p-6 shadow-xl">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <FiBarChart2 /> History (Grouped by Date)
      </h2>

      <div className="max-h-64 overflow-y-auto pr-2 space-y-4">
        {Object.entries(history).map(([date, items], idx) => (
          <div key={idx} className="bg-[#1e1e27] p-4 rounded-xl border border-gray-700">
            <h3 className="text-lg text-purple-300 font-semibold mb-2">{date}</h3>

            {items.map((h) => (
              <div key={h.HistoryId} className="p-2 bg-[#2d2d38] rounded-lg text-sm text-gray-300 mb-2">
                <div><b>ID:</b> {h.UID}</div>
                <div><b>Status:</b> {h.Status}</div>
                <div><b>Time:</b> {new Date(h.CreatedDate).toLocaleString()}</div>

                <img
                  src={h.ImageUrl}
                  className="w-32 h-20 rounded-lg mt-2 border border-gray-600 object-cover"
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>

  </div>

{/* RIGHT SIDE */}
<div className="xl:col-span-1 w-full flex flex-col gap-6">

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

    {/* TEST BUTTONS */}
    <div className="mb-8">
      <span className="text-lg font-medium">Test Notify</span>
      <div className="flex gap-3 mt-3">
        <button
          onClick={() => handleNotify("ok", "12345")}
          className="px-5 py-2 bg-green-600 hover:bg-green-500 rounded-xl"
        >
          Notify OK
        </button>
        <button
          onClick={() => handleNotify("bad", "12345")}
          className="px-5 py-2 bg-red-600 hover:bg-red-500 rounded-xl"
        >
          Notify BAD
        </button>
      </div>
    </div>

    {/* CAPTURE TEST */}
    <div className="mb-8">
      <span className="text-lg font-medium">Manual Capture Test</span>
      <button
        onClick={testCaptureFlow}
        className="mt-3 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md"
      >
        📸 Trigger Capture & Save History
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

</div>

</div>

      {/* ALBUM */}
      {albumOpen && (
        <div className="bg-[#262631] mt-8 p-6 rounded-2xl shadow-xl grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {photos.map((seq, i) => (
            <img
              key={i}
              src={ESP.photo(seq)}
              className="rounded-xl shadow-md object-cover h-28 w-full border border-gray-700"
            />
          ))}
        </div>
      )}
    </div>
  );
}
