const baseBookmarkDirectoryName = "AutoboomarkTabs";
const isVivaldi = !!navigator.appVersion.match(/Vivaldi/);
const alarmName = "ALARM-AUTOBOOKMARK-TABS";

chrome.runtime.onStartup.addListener(() => {
  console.log("autobookmarktabs onStartup");
  run()
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("autobookmarktabs onInstalled");
  chrome.alarms.create(alarmName, {
    delayInMinutes: 1.0,
    periodInMinutes: 1.0
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


async function run(){
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

//Promise
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
