// WiFi Card - waiting-room pack: one printable card, two labelled QR codes.
// QR 1 joins the guest WiFi (WIFI: payload), QR 2 opens the workspace's public
// enquiry form (quote/booking). All generation is client-side: the WiFi
// password never leaves the owner's browser. Per the 6 Nov verdict page.

function esc(s: any): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

export function wifiCardPage(opts: { businessName: string; enquiryUrl: string; prefill?: { ssid: string; pass: string }; sample?: boolean }): string {
  const biz = esc(opts.businessName || "Your business");
  const enquiryUrl = esc(opts.enquiryUrl);
  const preSsid = esc(opts.prefill?.ssid || "");
  const prePass = esc(opts.prefill?.pass || "");
  const sampleBanner = opts.sample ? `<div class="card" style="border:2px dashed #F97316;background:#FFF7ED"><h2 style="margin-top:0">Sample preview</h2>
<p>This is the exact card your customers would see in your waiting room. Guests scan one code to join your guest WiFi and the other to send you an enquiry - it lands straight in your RevUp inbox. The sample below is filled in with demo details; your own card uses your business name and your real enquiry form.</p>
<p style="margin-bottom:0"><a class="btn btn-primary" href="/signup">Get your own card - start free</a></p></div>` : "";
  return `<style>
.wc-grid{display:grid;grid-template-columns:minmax(280px,380px) minmax(0,1fr);gap:22px;align-items:start}
.wc-grid>*{min-width:0}
.wc-grid input,.wc-grid select{box-sizing:border-box;max-width:100%}
@media(max-width:860px){.wc-grid{grid-template-columns:minmax(0,1fr)}}
.wc-preview-wrap{position:sticky;top:16px}
.wifi-card{box-sizing:border-box;width:148mm;max-width:100%;aspect-ratio:148/105;background:#fff;border:1px solid #E7E5E4;border-radius:10px;box-shadow:0 1px 2px rgba(28,25,23,.05),0 8px 24px rgba(249,115,22,.10);display:flex;flex-direction:column;overflow:hidden}
.wc-head{background:#FAFAF9;border-bottom:1px solid #E7E5E4;padding:10px 16px;display:flex;align-items:baseline;justify-content:space-between;gap:8px}
.wc-biz{font-size:17px;font-weight:700;letter-spacing:-0.2px;color:#1C1917;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wc-tag{font-size:11px;font-weight:600;color:#EA580C;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap}
.wc-body{flex:1;display:flex;align-items:center;justify-content:space-evenly;gap:10px;padding:10px 12px}
.wc-qr{display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center}
.wc-qr .qrbox{background:#fff;border:1px solid #E7E5E4;border-radius:6px;padding:6px;line-height:0}
.wc-qr .qrbox svg{width:26mm;height:26mm;max-width:104px;max-height:104px}
.wc-lab{font-size:12px;font-weight:600;color:#1C1917;line-height:1.35}
.wc-sub{font-size:10.5px;color:#57534E;line-height:1.35;max-width:34mm}
.wc-net{overflow-wrap:anywhere;font-size:11px;color:#57534E;margin-top:2px;line-height:1.4}
.wc-net b{color:#1C1917;font-weight:600}
.wc-foot{border-top:1px solid #E7E5E4;padding:6px 16px;display:flex;justify-content:space-between;align-items:center}
.wc-foot span{font-size:9.5px;color:#A8A29E}
#wifi-card-print{display:none}
@media print{
  body.printing > *:not(#wifi-card-print){display:none!important}
  #wifi-card-print{display:flex;width:148mm;height:105mm;aspect-ratio:auto;box-shadow:none;border:1px solid #E7E5E4;margin:0}
  @page{size:148mm 105mm;margin:0}
}
</style>
${sampleBanner}
<div class="card"><h2 style="margin-top:0">Waiting-room WiFi card</h2>
<p>One printable card for your waiting room, with two separate codes: guests scan one to join your WiFi, and scan the other to ask for a quote or book - that lands straight in your RevUp inbox. Fill in your WiFi details below; the card is made right here in your browser and your WiFi password never leaves this page.</p></div>
<div class="wc-grid">
<div class="card"><h2 style="margin-top:0">Your details</h2>
<form id="wc-form" onsubmit="return false">
<label for="wc-biz">Business name on the card</label>
<input id="wc-biz" maxlength="48" value="${biz}">
<label for="wc-ssid">WiFi network name (SSID)</label>
<input id="wc-ssid" maxlength="32" value="${preSsid}" placeholder="e.g. DemoDental-Guest" autocomplete="off">
<label for="wc-pass">WiFi password</label>
<input id="wc-pass" maxlength="63" value="${prePass}" placeholder="Your guest WiFi password" autocomplete="off">
<label for="wc-sec">Security</label>
<select id="wc-sec"><option value="WPA" selected>WPA / WPA2 / WPA3</option><option value="WEP">WEP</option><option value="nopass">Open (no password)</option></select>
<label style="display:flex;align-items:center;gap:8px;font-weight:500"><input type="checkbox" id="wc-showpass" checked style="width:auto;margin:0"> Print the password as text on the card</label>
<p class="mut" style="margin:6px 0 0">Use a separate guest network, never your office or till network. A photo of the card shows the WiFi details, so keep it to guest WiFi only.</p>
<button type="button" class="btn btn-primary" style="width:100%;margin-top:14px" onclick="window.print()">Print / save as PDF</button>
</form></div>
<div class="wc-preview-wrap">
<div class="print-root">
<div class="wifi-card" id="wifi-card">
<div class="wc-head"><span class="wc-biz" id="wc-biz-out">${biz}</span><span class="wc-tag">Free guest WiFi</span></div>
<div class="wc-body">
<div class="wc-qr"><div class="qrbox" id="qr-wifi"></div><div><div class="wc-lab">Scan to join our WiFi</div><div class="wc-net" id="wc-net-out">Network: <b>-</b><br>Password: <b>-</b></div></div></div>
<div class="wc-qr"><div class="qrbox" id="qr-enquiry"></div><div><div class="wc-lab">Need a quote or want to book?</div><div class="wc-sub">Scan to message us - we reply fast.</div></div></div>
</div>
<div class="wc-foot"><span>Powered by RevUp</span><span id="wc-foot-note">Free for our guests</span></div>
</div>
</div>
</div>
</div>
<script src="/static/qrcode.js"></script>
<script>
(function(){
  var ENQ = ${JSON.stringify(opts.enquiryUrl)};
  function escWifi(s){ return String(s||"").replace(/([\\\\;,:"'])/g, "\\\\$1"); }
  function makeQr(el, text){
    el.innerHTML = "";
    var q = window.qrcode(0, "M");
    q.addData(text); q.make();
    el.innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    var svg = el.querySelector("svg");
    if (svg){ svg.setAttribute("width","100%"); svg.setAttribute("height","100%"); }
  }
  function wifiPayload(){
    var sec = document.getElementById("wc-sec").value;
    var ssid = document.getElementById("wc-ssid").value.trim();
    var pass = document.getElementById("wc-pass").value;
    if (!ssid) return "";
    if (sec === "nopass") return "WIFI:T:nopass;S:" + escWifi(ssid) + ";;";
    return "WIFI:T:" + sec + ";S:" + escWifi(ssid) + ";P:" + escWifi(pass) + ";;";
  }
  function render(){
    var biz = document.getElementById("wc-biz").value.trim() || "Your business";
    var ssid = document.getElementById("wc-ssid").value.trim();
    var pass = document.getElementById("wc-pass").value;
    var sec = document.getElementById("wc-sec").value;
    var showPass = document.getElementById("wc-showpass").checked;
    document.getElementById("wc-biz-out").textContent = biz;
    var net = "Network: <b>" + (ssid ? ssid.replace(/</g,"&lt;") : "-") + "</b>";
    if (sec !== "nopass") net += "<br>Password: <b>" + (showPass && pass ? pass.replace(/</g,"&lt;") : (pass ? "ask at the counter" : "-")) + "</b>";
    document.getElementById("wc-net-out").innerHTML = net;
    var wp = wifiPayload();
    makeQr(document.getElementById("qr-wifi"), wp || "WIFI:T:nopass;S:guest;;");
    makeQr(document.getElementById("qr-enquiry"), ENQ);
  }
  window.addEventListener("beforeprint", function(){
    var old = document.getElementById("wifi-card-print"); if (old) old.remove();
    var c = document.getElementById("wifi-card").cloneNode(true);
    c.id = "wifi-card-print";
    document.body.appendChild(c);
    document.body.classList.add("printing");
  });
  window.addEventListener("afterprint", function(){
    var c = document.getElementById("wifi-card-print"); if (c) c.remove();
    document.body.classList.remove("printing");
  });
  ["wc-biz","wc-ssid","wc-pass","wc-sec","wc-showpass"].forEach(function(id){
    document.getElementById(id).addEventListener("input", render);
    document.getElementById(id).addEventListener("change", render);
  });
  render();
})();
</script>`;
}
