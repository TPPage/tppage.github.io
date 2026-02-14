const link = document.getElementById("openModal");

link.onclick = function(e) {
  e.preventDefault();

  // Popup principale
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.style.display = "block";

  const content = document.createElement("div");
  content.className = "modal-content";

  const close = document.createElement("span");
  close.className = "close";
  close.innerHTML = "&times;";
  close.onclick = function() {
    document.body.removeChild(modal);
  };

  const title = document.createElement("h2");
  title.textContent = "IBM 5150 Case";
  title.className = "titolo";

  const imagesDiv = document.createElement("div");
  imagesDiv.className = "modal-images";

  const photos = [
    { src: "images/foto1.png", alt: "Front view" },
    { src: "images/foto2.png", alt: "Angle view" },
    { src: "images/foto3.png", alt: "Back view" },
    { src: "images/foto4.png", alt: "Top view" },
    { src: "images/foto5.png", alt: "Internal view 1" },
    { src: "images/foto6.png", alt: "Internal view 2" }
  ];

  photos.forEach(photo => {
    const img = document.createElement("img");
    img.src = photo.src;
    img.alt = photo.alt;
    img.style.width = "30%";
    img.style.margin = "10px";
    img.style.cursor = "pointer";

    // Clic → apri overlay con immagine ingrandita
    img.onclick = function() {
      const overlay = document.createElement("div");
      overlay.className = "modal";
      overlay.style.display = "block";

      const overlayContent = document.createElement("div");
      overlayContent.className = "modal-content";
      overlayContent.style.textAlign = "center";

      const overlayClose = document.createElement("span");
      overlayClose.className = "close";
      overlayClose.innerHTML = "&times;";
      overlayClose.onclick = function() {
        document.body.removeChild(overlay);
      };

      const bigImg = document.createElement("img");
      bigImg.src = photo.src;
      bigImg.alt = photo.alt;
      bigImg.style.width = "90%";
      bigImg.style.borderRadius = "10px";

      overlayContent.appendChild(overlayClose);
      overlayContent.appendChild(bigImg);
      overlay.appendChild(overlayContent);
      document.body.appendChild(overlay);

      // Chiudi cliccando fuori
      overlay.onclick = function(event) {
        if(event.target === overlay) {
          document.body.removeChild(overlay);
        }
      };
    };

    imagesDiv.appendChild(img);
  });

  const downloadLink = document.createElement("a");
  downloadLink.href = "https://drive.google.com/file/d/1fKzRye_4fCo3m44-EEoyGSHXR-0ISalb/view?usp=drive_link";
  downloadLink.textContent = "Download STL";
  downloadLink.className = "titolo";

  content.appendChild(close);
  content.appendChild(title);
  content.appendChild(imagesDiv);
  content.appendChild(downloadLink);
  modal.appendChild(content);
  document.body.appendChild(modal);

  // Chiudi cliccando fuori dal popup principale
  modal.onclick = function(event) {
    if(event.target === modal) {
      document.body.removeChild(modal);
    }
  };
};
