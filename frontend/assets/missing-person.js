(function () {
"use strict";
var form = document.getElementById("missingForm");
if (!form) return;

var MAX_PHOTO_BYTES = 2 * 1024 * 1024; // ~2MB, matches the backend's cap
var ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

function readFileAsDataURL(file) {
    return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () { resolve(reader.result); };
        reader.onerror = function () { reject(new Error("Could not read the photo file.")); };
        reader.readAsDataURL(file);
    });
}

form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var msg = document.getElementById("missingMsg");
    var submitBtn = form.querySelector('button[type="submit"]');
    var fd = new FormData(form);

    var payload = {
        name: fd.get("name"), age: Number(fd.get("age")), gender: fd.get("gender"),
        last_seen: fd.get("last_seen"), location: fd.get("location"), details: fd.get("details"),
        contact_name: fd.get("contact_name"), contact_phone: fd.get("contact_phone")
    };

    var photoInput = form.querySelector('input[name="photo"]');
    var photoFile = photoInput && photoInput.files && photoInput.files[0];
    if (photoFile) {
        // Raster formats only — an uploaded SVG can carry a <script>, which
        // would be a stored-XSS vector if it's ever rendered back.
        if (ALLOWED_PHOTO_TYPES.indexOf(photoFile.type) === -1) {
            msg.innerHTML = "<strong>Unsupported photo format.</strong> Please upload a JPEG, PNG or WEBP image.";
            return;
        }
        if (photoFile.size > MAX_PHOTO_BYTES) {
            msg.innerHTML = "<strong>Photo is too large.</strong> Please choose an image under 2MB.";
            return;
        }
        try {
            payload.photo = await readFileAsDataURL(photoFile);
        } catch (err) {
            msg.innerHTML = "<strong>Could not read the photo.</strong> You can still submit without it.";
        }
    }

    if (typeof CycloLoader !== "undefined") {
        CycloLoader.show("Submitting missing-person report…");
        if (submitBtn) submitBtn.classList.add("cy-btn-busy");
    }

    try {
        var apiBase = window.CYCLOTRACK_API_BASE ? window.CYCLOTRACK_API_BASE.replace(/\/+$/, "") : "http://localhost:8000";
        var r = await fetch(apiBase + "/api/v1/missing-persons", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!r.ok) throw new Error();
        var d = await r.json();
        msg.innerHTML = "<strong>Report submitted.</strong> Reference: " + d.id + ". Keep this reference for authorised responders.";
    } catch (err) {
        var id = "MP-LOCAL-" + Date.now().toString(36).toUpperCase();
        try {
            var q = JSON.parse(localStorage.getItem("cyclotrack_missing_reports") || "[]");
            q.push(Object.assign({ id: id, created_at: new Date().toISOString(), status: "Missing" }, payload));
            localStorage.setItem("cyclotrack_missing_reports", JSON.stringify(q));
        } catch (x) {}
        msg.innerHTML = "<strong>Saved on this device.</strong> Reference: " + id + ". The operations server is unavailable; call 112 for immediate emergencies.";
    } finally {
        if (typeof CycloLoader !== "undefined") {
            CycloLoader.hide();
            if (submitBtn) submitBtn.classList.remove("cy-btn-busy");
        }
    }
    form.reset();
});
})();
