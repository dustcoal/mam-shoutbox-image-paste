// ==UserScript==
// @name        jack's MaM shoutbox image paste script
// @namespace   Violentmonkey Scripts
// @match       https://www.myanonamouse.net/*
// @grant       GM_xmlhttpRequest
// @version     1.0
// @author      -
// @description 4/1/2025, 12:03:22 PM
// ==/UserScript==

(function() {
  var pasteSettings = null;
  //'use strict';
  /* Loads variables from browsers localstorage (COOKIES?!) */
  function loadDefaultSettings() {
    let pasteSettings_entry = localStorage.getItem('mam_paste_settings');
    if (pasteSettings_entry && pasteSettings_entry != undefined && pasteSettings_entry != "undefined") {
      pasteSettings = JSON.parse(pasteSettings_entry);
    } else {
      pasteSettings = {};
    }
    if (!('api_key' in pasteSettings)) {
      pasteSettings.api_key = null;
    }
    if (!('paste_images_expire' in pasteSettings)) {
      pasteSettings.paste_images_expire = true;
    }
    if (!('paste_images_expire_time' in pasteSettings)) {
      pasteSettings.paste_images_expire_time = 5;
    }
  }
  loadDefaultSettings();

  function addSpinner() {
    let blockFoot = document.querySelector('.blockFoot');

    if (!blockFoot) {
      return;
    }

    blockFoot.style.display = 'flex';

    let existingSpinner = blockFoot.querySelector('.spinner');
    if (existingSpinner) {
      return;
    }

    // Create a new image element for the spinner
    let spinner = document.createElement('img');
    spinner.style.marginLeft = '10px';
    spinner.src = 'https://cdn.myanonamouse.net/imagebucket/185207/loading_iig8wdt.gif';
    spinner.alt = 'Please be patient...';
    spinner.classList.add('spinner');

    let blockFootHeight = blockFoot.offsetHeight;
    spinner.style.width = `${blockFootHeight * 0.8}px`; // 80% of blockFoot's height
    spinner.style.height = `${blockFootHeight * 0.8}px`; // Match the width for a square aspect ratio

    let existingStatus = blockFoot.querySelector('.statusText');

    // Insert the spinner before the status text, if it exists
    if (existingStatus) {
      blockFoot.insertBefore(spinner, existingStatus);
    } else {
      // If there is no status text, just append the spinner
      blockFoot.appendChild(spinner);
    }
  }

  window.addSpinner = addSpinner;

  function removeSpinner() {
    let blockFoot = document.querySelector('.blockFoot');

    if (!blockFoot) {
      return;
    }

    // Find and remove the spinner if it exists
    let existingSpinner = blockFoot.querySelector('.spinner');
    if (existingSpinner) {
      blockFoot.removeChild(existingSpinner);
    }
  }

  window.removeSpinner = removeSpinner;

  function updateStatus(text, dismissable = false) {
    let blockFoot = document.querySelector('.blockFoot');

    if (!blockFoot) {
      return;
    }

    blockFoot.style.display = 'flex';

    // Check if there is already a spinner and a status text
    let existingSpinner = blockFoot.querySelector('.spinner');
    let existingStatus = blockFoot.querySelector('.statusText');

    let statusText = existingStatus || document.createElement('span');
    statusText.style.display = 'flex';
    statusText.style.alignItems = 'center';
    statusText.style.marginLeft = '10px';
    statusText.classList.add('statusText');
    statusText.textContent = text;

    // If dismissable is true, make it italic and add hover and click events
    if (dismissable) {
      statusText.title = 'Dismiss';
      statusText.style.fontStyle = 'italic';
      statusText.addEventListener('mouseover', () => {
        statusText.style.color = 'red';  // Turn text red on hover
        statusText.style.cursor = 'pointer';
      });
      statusText.addEventListener('mouseout', () => {
        statusText.style.color = '';  // Revert back to original color when not hovered
        statusText.style.cursor = 'default';
      });
      statusText.addEventListener('click', () => {
        blockFoot.removeChild(statusText);  // Remove the status text on click
      });
    }

    // Append the status text to blockFoot, either replacing or adding it
    if (!existingStatus) {
      blockFoot.appendChild(statusText);
    } else {
      existingStatus.textContent = text;  // Update the existing status text if it exists
    }
  }

  window.updateStatus = updateStatus;

  function main() {
    console.log('Hello from the mam shoutbox image paste script by jack!');
    let shoutboxForm = document.getElementById("sbform");
    if (!shoutboxForm) {
      return ;
    }
    console.log("Found shoutbox, hooking.");
    let input = document.getElementById("shbox_text");


    if (input) {
      addSettingsButton();
      input.addEventListener("paste", function (event) {
        // Access the clipboard data
        let clipboardData = event.clipboardData || window.clipboardData;

        // Check if the pasted data contains any items of type "image"
        let items = clipboardData.items;
        for (let i = 0; i < items.length; i++) {
          let item = items[i];

          // If the item is an image, handle it
          if (item.type.indexOf("image") !== -1) {
            event.preventDefault(); // Prevent the default paste action (e.g., pasting the image directly)
            console.log("Tried pasting image!");
            if (!pasteSettings.api_key) {
              updateStatus("No imgbb API key! Please add it in the settings (📋).", true);
              return;
            }

            let file = item.getAsFile(); // Get the file object of the image
            let reader = new FileReader();

            // Read the image file as a base64 data URL
            reader.onload = function (e) {
              let imageDataUrl = e.target.result;

              // Upload the image to imgbb using the API
              uploadImageToImgBB(imageDataUrl);
            };

            // Read the image file
            reader.readAsDataURL(file);

            return; // Exit once the image has been handled
          }
        }
      });
    }

  }
  window.addEventListener('load', main, false);

  function uploadImageToImgBB(imageDataUrl) {
    addSpinner();
    updateStatus("Uploading image to Imgbb...");

    // Prepare the form data
    const formData = new FormData();
    formData.append('image', imageDataUrl.split(',')[1]); // Remove the data URL part before uploading
    console.log(imageDataUrl.split(',')[1]);
    formData.append('name', Math.random().toString(36).slice(2));

    const formDataObject = {};
    formData.forEach((value, key) => {
      formDataObject[key] = value;
    });

    let url = `https://api.imgbb.com/1/upload?key=${pasteSettings.api_key}`;

    if (pasteSettings.paste_images_expire) {
      url += `&expiration=${pasteSettings.paste_images_expire_time * 3600}`;
    }

    // Use GM_xmlhttpRequest to bypass CORS
    GM_xmlhttpRequest({
      method: 'POST',
      url: url,
      data: formData,
      onload: function (response) {
        const data = JSON.parse(response.responseText);
        console.log("Status:", data.success ? "Success" : "Failed");
        if (data.success) {
          console.log("Image uploaded successfully:", data.data.url);
          removeSpinner();
          updateStatus("");

          // Insert the markdown into the input field
          const imageUrl = data.data.url;
          document.getElementById("shbox_text").value += `[imgurl]${imageUrl}[/imgurl] `;
        } else {
          console.error("Image upload failed:", data);
          updateStatus(`Image upload failed: ${data.error.message}`, true);
          removeSpinner();
        }
      },
      onerror: function (error) {
        console.error("Error uploading image:", error);
        updateStatus("Error uploading image. Please try again.", true);
        removeSpinner();
      }
    });
  }

  /* Returns the real coordinates of an element, even when the user has scrolled on the page */
  /* The veracity of these coordinates has been fact checked by real American Pqtriots */
  function getEffectiveCoords(element) {
    let div = element;
    let mouse_x_offset = 40;
    let mouse_y_offset = -50;
    let effective_x = event.pageX + mouse_x_offset;
    let effective_y = event.pageY + mouse_y_offset;

    let clientWidth = document.documentElement.clientWidth;
    let clientHeight = document.documentElement.clientHeight;

    if (effective_x + div.offsetWidth > clientWidth) {
      effective_x -= Math.abs(clientWidth - (effective_x + div.offsetWidth));
      let additional_offset = 75;
      if (effective_y + div.offsetHeight + additional_offset > clientHeight) {
        effective_y -= (div.offsetHeight);
      } else {
        effective_y += additional_offset;
      }
    }
    if (effective_y + div.offsetHeight > clientHeight) {
      effective_y -= Math.abs(clientHeight - (effective_y + div.offsetHeight + 10));
    }
    return {x: effective_x, y: effective_y}
  }

  /* floating upload emoji menu */
  function showSettingsMenu(x, y) {
    // Create the floating menu
    var floatingMenu = document.createElement('div');
    floatingMenu.id = 'pasteFloatingMenuSettings';
    floatingMenu.style.position = 'absolute';
    floatingMenu.style.top = y + 'px'; // Adjust the top position as needed
    floatingMenu.style.left = x + 'px'; // Adjust the right position as needed
    floatingMenu.style.backgroundColor = 'white';
    floatingMenu.style.border = '1px solid #ccc';
    floatingMenu.style.padding = '10px';
    floatingMenu.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.1)';
    floatingMenu.style.display = 'block';

    floatingMenu.innerHTML = `
        <div style="display: flex; justify-content: space-between;">
        <h3 style='font-family: "Trebuchet MS",Verdana,Arial,Helvetica,sans-serif;'>Image Paste Script Settings</h3>
        <button onclick="this.remove();" style="margin-left: auto;">❌</button>
        </div>

        <br>

        <label>
          Imgbb API key (you can get one <a href="https://api.imgbb.com/" target="blank">here</a>):
            <input type="text" id="paste_api_key_input" value="${pasteSettings.api_key || ''}">
        </label>

        <br>

        <label>
            <input type="checkbox" id="paste_images_expire">Auto-delete uploaded images.
        </label>
        <br>
        <label>
            Image auto-deletion time (hours):
            <input type="number" id="paste_images_expire_time" value="${pasteSettings.paste_images_expire_time}">
        </label>

        <br>
        <br>
        <button id="pasteExportButton">Export Settings</button>
        <br>
        <input type="file" id="pasteImportInput" accept=".json">
        <button id="pasteImportButton">Import Settings</button>
        <br>
        <p id="pasteImport_status"></p>

        <p>Note: you may need to reload the page for some settings to apply</p>

    `;
    document.body.appendChild(floatingMenu);
    document.getElementById("paste_images_expire").checked = pasteSettings.paste_images_expire;

    /* EXPORT/IMPORT */
    document.getElementById('pasteExportButton').addEventListener('click', function() {
      if (!pasteSettings) {
        pasteSettings = {};
      }

      // Create a combined object for export
      const exportData = {
        mam_paste_settings: pasteSettings,
      };

      // Convert the combined object to a JSON string
      const exportString = JSON.stringify(exportData);

      // Create a Blob containing the export data
      const blob = new Blob([exportString], { type: 'application/json' });

      // Create a download link and trigger the download
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(blob);
      downloadLink.download = `mam_paste_export_${new Date().toISOString().split('.')[0].replace(/:/g, '-')}.json`;
      downloadLink.click();
    });

    document.getElementById('pasteImportButton').addEventListener('click', function() {
      const importInput = document.getElementById('pasteImportInput');

      // Ensure a file is selected
      if (!importInput.files || importInput.files.length === 0) {
        document.getElementById('pasteImport_status').innerText = '❌ Please select a JSON file to import';
        console.error('Error: Please select a JSON file to import.');
        return;
      }

      // Get the selected file
      const importedFile = importInput.files[0];

      // Create a FileReader to read the contents of the file
      const reader = new FileReader();

      reader.onload = function(event) {
        try {
          // Parse the JSON data
          const importedData = JSON.parse(event.target.result);

          // Check if the required objects are present in the imported data
          if (!importedData) {
            document.getElementById('pasteImport_status').innerText = '❌ Invalid JSON file or missing required objects';
            console.error('Error: Invalid JSON file or missing required objects.');
            return;
          }

          // Save the imported objects to local storage
          if ('mam_paste_settings' in importedData) {
            localStorage.setItem('mam_paste_settings', JSON.stringify(importedData.mam_paste_settings));
          }

          loadDefaultSettings();

          document.getElementById("paste_images_expire").checked = pasteSettings.paste_images_expire;
          document.getElementById("paste_images_expire_time").value = pasteSettings.paste_images_expire_time;
          document.getElementById("paste_api_key_input").value = pasteSettings.api_key;

          document.getElementById('pasteImport_status').innerText = '✅ Import successful!';
          console.log('Import successful!');
        } catch (error) {
          console.log(error);
          document.getElementById('pasteImport_status').innerText = '❌ Unable to import, invalid JSON file';
          console.error('Error: Unable to import. Invalid JSON file.');
        }
      };

      // Read the contents of the file as text
      reader.readAsText(importedFile);
    });

    document.getElementById('paste_api_key_input').addEventListener("input", (event) => {
      //console.log("Input value changed:", event.target.value);
      if (event.target.value.length > 0) {
        pasteSettings.api_key = event.target.value;
      } else {
        pasteSettings.api_key = null;
      }
      localStorage.setItem('mam_paste_settings', JSON.stringify(pasteSettings));
    });

    document.getElementById('paste_images_expire').addEventListener("input", (event) => {
      console.log("Input value changed:", event.target.value);
      pasteSettings.paste_images_expire = document.getElementById('paste_images_expire').checked;
      localStorage.setItem('mam_paste_settings', JSON.stringify(pasteSettings));
    });

    document.getElementById('paste_images_expire_time').addEventListener("input", (event) => {
      console.log("Input value changed:", event.target.value);
      if (event.target.value > 0) {
        pasteSettings.paste_images_expire_time = event.target.value;
        updateStatus("");
      } else {
        updateStatus("Please input a positive time value.", true);
      }
      localStorage.setItem('mam_paste_settings', JSON.stringify(pasteSettings));
    });

    // Attach click event to the document to hide the menu when clicking outside
    document.addEventListener('click', function (event) {
        if (!event.target.matches('#pasteSettings_button') && !event.target.matches('#pasteFloatingMenuSettings') && !event.target.closest('#pasteFloatingMenuSettings')) {
            floatingMenu.remove();
        }
    });
  }

  function addSettingsButton() {
    let settingsButton = document.createElement('button');
    settingsButton.id = 'pasteSettings_button';
    settingsButton.textContent = '📋';
    settingsButton.style.marginTop = '2px';
    settingsButton.style.marginRight = '2px';
    settingsButton.style.paddingLeft = '1px';
    settingsButton.style.paddingRight = '1px';
    settingsButton.title = 'Paste Settings';

    settingsButton.addEventListener('click', function () {
        let real_coords = getEffectiveCoords(settingsButton);
        showSettingsMenu(real_coords.x, real_coords.y);
    });

    let elem = document.getElementById('ui-id-2');
    if (elem) {
      elem.parentNode.after(settingsButton);
    }
  }
})();
