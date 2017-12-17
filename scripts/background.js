const baseBookmarkDirectoryName = "AutoboomarkTabs";
const isVivaldi = !!navigator.appVersion.match(/Vivaldi/);
const alarmName = "ALARM-AUTOBOOKMARK-TABS";
const numOfRotate = 3;
const alarmIntervalMin = 1.0;

chrome.runtime.onStartup.addListener(() => {
  console.log("autobookmarktabs onStartup");
  run()
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("autobookmarktabs onInstalled");
  chrome.alarms.create(alarmName, {
    periodInMinutes: alarmIntervalMin
  });
  run()
});

chrome.alarms.onAlarm.addListener((alarm) => {
  console.log(`onAlarm: ${JSON.stringify(alarm)}`);
  if (alarm.name === alarmName) {
    console.log("Alarm called!");
    run();
  }
});


async function run() {
  console.log("run() called!!!!");
  const allTabs = await getAllTabs();

  let tabUrls = allTabs.map(tab => tab.url);
  console.log(`Tabs: num: ${tabUrls.length}, ${tabUrls}`);

  const bookmarkTree = await getBookmarkTree();
  console.log(`${bookmarkTree.id}`)

  let baseBookmarkDirectory = getChildDirectory(bookmarkTree, baseBookmarkDirectoryName);
  if (!baseBookmarkDirectory) {
    baseBookmarkDirectory = await createDirectory(bookmarkTree, baseBookmarkDirectoryName)
  }

  let targetBookmarkDirectory = await createDirectory(baseBookmarkDirectory, (new Date()).toISOString());

  for (let tab of allTabs) {
    await createBookmark(targetBookmarkDirectory, tab.title, tab.url)
  }

  deleteOld();
  return;
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
    console.log(JSON.stringify(dir));
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
  console.log(parentDirectory.id)
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
      resolve(r);
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
