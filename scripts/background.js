const baseBookmarkDirectoryName = "AutoboomarkTabs";
const isVivaldi = !!navigator.appVersion.match(/Vivaldi/);
const alarmName = "ALARM-AUTOBOOKMARK-TABS";
const numOfRotate = 10;
const alarmIntervalMin = 1.0;
const idleSeconds = 5 * 60;

var lastState = null;

chrome.runtime.onInstalled.addListener(() => {
  console.log("autobookmarktabs onInstalled");
  createAlarm();
  // run();
  return;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  console.log(`onAlarm: ${JSON.stringify(alarm)}`);
  if (alarm.name !== alarmName) {
    return;
  }

  chrome.idle.queryState(idleSeconds, (state) => {
    console.log(`State: ${state}`);
    if (state === "idle" && lastState !== "idle") {
      run();
    }
    lastState = state;
  });
  return;
});

function createAlarm() {
  chrome.alarms.create(alarmName, {
    delayInMinutes: 1.0,
    periodInMinutes: alarmIntervalMin
  });
}

function run() {
  console.log("Start saving tabs");
  save();
  deleteOld();
  return;
}

async function save() {
  const allTabs = await getAllTabs();

  let tabUrls = allTabs.map(tab => tab.url);
  console.log(`Tabs: num: ${tabUrls.length}, ${tabUrls}`);

  const bookmarkTree = await getBookmarkTree();

  let baseBookmarkDirectory = getChildDirectory(bookmarkTree, baseBookmarkDirectoryName);
  if (!baseBookmarkDirectory) {
    baseBookmarkDirectory = await createDirectory(bookmarkTree, baseBookmarkDirectoryName)
  }

  let targetBookmarkDirectory = await createDirectory(baseBookmarkDirectory, (new Date()).toISOString());

  for (let tab of allTabs) {
    await createBookmark(targetBookmarkDirectory, tab.title, tab.url)
  }

}

async function deleteOld() {
  const bookmarkTree = await getBookmarkTree();

  let baseBookmarkDirectory = getChildDirectory(bookmarkTree, baseBookmarkDirectoryName);
  if (baseBookmarkDirectory === null) {
    return;
  }

  let target = getSortedChildren(baseBookmarkDirectory).slice(0, numOfRotate * (-1));
  console.log(`Delete target: ${target.map(e => e.title)}`);

  for (let dir of target) {
    await removeTree(dir);
  }
  return;
}

function getSortedChildren(parentDirectory) {
  return parentDirectory.children.slice().sort((l, r) => (l.title > r.title));
}

function getChildDirectory(parentDirectory, name) {
  if (!parentDirectory.children) {
    return null;
  }
  for (let i of parentDirectory.children) {
    if (i.url) {
      continue;
    }
    if (i.title == name) {
      return i;
    }
  }
  return null;
}

function createDirectory(parentDirectory, name) {
  return new Promise(ok => {
    chrome.bookmarks.create({
      parentId: parentDirectory.id,
      title: name,
      url: null
    }, r => {
      ok(r);
    });
  })
}

function createBookmark(parentDirectory, title, url) {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.create({
      parentId: parentDirectory.id,
      title: title,
      url: url
    }, r => {
      setTimeout(() => {
        resolve(r);
      }, 1000);
    });
  });
}

function getBookmarkTree(){
  return new Promise((resolve, reject) => {
    chrome.bookmarks.getTree(r => {
      if (isVivaldi) {
        return resolve(r[0].children[0])
      } else {
        return resolve(r[0])
      }
    });
  });
}

function getAllTabs(){
  return new Promise(ok => {
    chrome.tabs.query({}, r =>{
      ok(r);
    })
  });
}

function removeTree(target){
  return new Promise((resolve, reject) => {
    chrome.bookmarks.removeTree(target.id, r => {
      resolve(r);
    });
  });
}
