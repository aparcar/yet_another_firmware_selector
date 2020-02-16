data = {}

function loadFile(url, callback) {
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
      callback(JSON.parse(xmlhttp.responseText), url);
    }
  };
  xmlhttp.open('GET', url, true);
  xmlhttp.send();
}

function setupSelectList(select, items, onselection) {
  for (var i = 0; i < items.length; i += 1) {
    var option = document.createElement("OPTION");
    option.innerHTML = items[i];
    select.appendChild(option);
  }

  select.addEventListener("change", function(e) {
    onselection(items[select.selectedIndex]);
  });

  if (select.selectedIndex >= 0) {
    onselection(items[select.selectedIndex]);
  }
}

// Change the translation of the entire document
function changeLanguage(language) {
  var mapping = translations[language];
  if (mapping) {
    for (var tr in mapping) {
      Array.from(document.getElementsByClassName(tr))
        .forEach(function(e) {
          e.innerText = mapping[tr];
        })
    }
  }
}

function setupAutocompleteList(input, items, onselection) {
  // the setupAutocompleteList function takes two arguments,
  // the text field element and an array of possible autocompleted values:
  var currentFocus = -1;

  // sort numbers and other characters separately
  var collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base'
  });

  items.sort(collator.compare);

  // execute a function when someone writes in the text field:
  input.oninput = function(e) {
    // clear images
    updateImages();

    var value = this.value;
    // close any already open lists of autocompleted values
    closeAllLists();
    if (!value) {
      return false;
    }

    // create a DIV element that will contain the items (values):
    var list = document.createElement("DIV");
    list.setAttribute("id", this.id + "-autocomplete-list");
    list.setAttribute("class", "autocomplete-items");
    // append the DIV element as a child of the autocomplete container:
    this.parentNode.appendChild(list);

    // for each item in the array...
    var c = 0;
    for (var i = 0; i < items.length; i += 1) {
      var item = items[i];

      // match
      var j = item.toUpperCase().indexOf(value.toUpperCase());
      if (j < 0) {
        continue;
      }

      c += 1;
      if (c >= 15) {
        var div = document.createElement("DIV");
        div.innerHTML = "...";
        list.appendChild(div);
        break;
      } else {
        var div = document.createElement("DIV");
        // make the matching letters bold:
        div.innerHTML = item.substr(0, j) +
          "<strong>" + item.substr(j, value.length) + "</strong>" +
          item.substr(j + value.length) +
          "<input type='hidden' value='" + item + "'>";

        div.addEventListener("click", function(e) {
          // set text field to selected value
          input.value = this.getElementsByTagName("input")[0].value;
          // close the list of autocompleted values,
          // (or any other open lists of autocompleted values:
          closeAllLists();
          // callback
          onselection(input.value);
        });

        list.appendChild(div);
      }
    }
  };

  input.onkeydown = function(e) {
    var x = document.getElementById(this.id + "-autocomplete-list");
    if (x) x = x.getElementsByTagName("div");
    if (e.keyCode == 40) {
      // key down
      currentFocus += 1;
      // and and make the current item more visible:
      setActive(x);
    } else if (e.keyCode == 38) {
      // key up
      currentFocus -= 1;
      // and and make the current item more visible:
      setActive(x);
    } else if (e.keyCode == 13) {
      // If the ENTER key is pressed, prevent the form from being submitted,
      e.preventDefault();
      if (currentFocus > -1) {
        // and simulate a click on the "active" item:
        if (x) x[currentFocus].click();
      }
    }
  };

  input.onfocus = function() {
    onselection(input.value);
  }

  function setActive(x) {
    // a function to classify an item as "active":
    if (!x) return false;
    // start by removing the "active" class on all items:
    for (var i = 0; i < x.length; i++) {
      x[i].classList.remove("autocomplete-active");
    }
    if (currentFocus >= x.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = (x.length - 1);
    // add class "autocomplete-active":
    x[currentFocus].classList.add("autocomplete-active");
  }

  function closeAllLists(elmnt) {
    // close all autocomplete lists in the document,
    // except the one passed as an argument:
    var x = document.getElementsByClassName("autocomplete-items");
    for (var i = 0; i < x.length; i++) {
      if (elmnt != x[i] && elmnt != input) {
        x[i].parentNode.removeChild(x[i]);
      }
    }
  }

  // execute a function when someone clicks in the document:
  document.addEventListener("click", function(e) {
    closeAllLists(e.target);
  });
}

function $(id) {
  return document.getElementById(id);
}

function updateImages(dllink, model, target, release, commit, images) {
  // add download button for image
  function add_link(image) {
    var a = document.createElement('A');
    a.classList.add('download-link');
    a.href = image_link
      .replace('%target', mobj.target)
      .replace('%release', release)
      .replace('%file', image.name)
      .replace('%commit', commit);
    var span = document.createElement('SPAN');
    span.appendChild(document.createTextNode(''));
    a.appendChild(span);
    a.appendChild(document.createTextNode(image.type.toUpperCase()));

    if (config.showHelp) {
      a.onmouseover = function() {
        // hide all help texts
        Array.from(document.getElementsByClassName('download-help'))
          .forEach(function(e) {
            e.style.display = 'none';
          });
        $(image.type + "-help").style.display = 'block';
      };
    }

    $('download-links').appendChild(a);
  }

  // remove all download links
  Array.from(document.getElementsByClassName('download-link'))
    .forEach(function(e) {
      e.remove();
    });

  // hide all help texts
  Array.from(document.getElementsByClassName('download-help'))
    .forEach(function(e) {
      e.style.display = 'none';
    });

  if (model && target && release && commit && images) {
    // fill out build info
    $('image-model').innerText = model;
    $('image-target').innerText = target;
    $('image-release').innerText = release;
    $('image-commit').innerText = commit;

    var prefix = findCommonPrefix(images);
    var entries = {
      'FACTORY': [],
      'SYSUPGRADE': [],
      'KERNEL': [],
      'ROOTFS': [],
      'SDCARD': [],
      'TFTP': [],
      'OTHER': []
    };

    for (var i in images) {
      var image = images[i];
      add_link(image);
    }

    $('images').style.display = 'block';
  } else {
    $('images').style.display = 'none';
  }
}

// hide fields
updateImages();
changeLanguage(config.language);

// TODO load multiple release files
static_release = "SNAPSHOT"

loadFile("names-" + static_release + ".json", function(obj_release) {
  obj = {}
  obj[static_release] = obj_release
  console.log(obj)
  setupSelectList($("releases"), Object.keys(obj), function(release) {
    setupAutocompleteList($("models"), Object.keys(obj[release]["models"]), function(model) {
      if (model in obj[release]["models"]) {
        // e.g. 'https://openwrt.org/%release/%file'
        var dllink = obj[release].link;
        // e.g. 'ath79/generic'
        var target = obj[release]["models"][model].target;
        // e.g. 'r12345-abcfefg321'
        var commit = obj[release].version_commit;
        // e.g. ['sysupgrade.bin', 'factory.bin']
        var images = obj[release]["models"][model].images;
        updateImages(dllink, model, target, release, commit, images);
      } else {
        updateImages();
      }
    });

    // trigger model update when selected release changes
    $("models").onfocus();
  });
})
