// popup.html 的 JS 檔案
const searchArea = document.querySelector("#search-area");
const searchInput = searchArea.querySelector("#search-input");
const suggestionsList = searchArea.querySelector("#suggestions-list");
const currentTags = document.querySelector("#current-tags");
const saveButton = document.querySelector("#save-button");
const nameInput = document.querySelector("#name-input");
const difficultyInput = document.querySelector("#difficulty-input");
const commentInput = document.querySelector("#comment-input");
const chromeStorage = chrome.storage.local;

chrome.tabs.query({ "active": true, "currentWindow": true }, (tabs) => {
    const url = tabs[0].url; // 目前分頁的網址
    const pageTitle = tabs[0].title; // 目前分頁的標題
    nameInput.value = pageTitle;

    chromeStorage.get(["problems"]).then((result) => {
        // 如果沒有任何紀錄，就新增它
        if (!result.problems) result.problems = {};

        // 如果目前的網址有記錄過，就顯示紀錄中的所有 tag
        if (result.problems.hasOwnProperty(url)) {
            result.problems[url]['tags'].forEach(addTag);
            nameInput.value = result.problems[url]['name'];
            difficultyInput.value = result.problems[url]['difficulty'];
            commentInput.value = result.problems[url]['comment'];
        }

        const allTags = [...new Set(Object.values(result.problems).reduce((acc, cur) => acc.concat(cur['tags']), []))];

        searchInput.addEventListener("keyup", (event) => inputKeyup(event, allTags));
        saveButton.addEventListener("click", (event) => save(event, url, result.problems));
    });
});

// 如果使用者在搜尋框按下任何按鍵，就觸發這個函式
function inputKeyup(event, tags) {
    let userInput = event.target.value.trim(); // 使用者輸入的文字

    // 如果沒有輸入，就清空搜尋建議
    if (userInput === "") {
        clearSuggestions();
        return;
    }

    // 顯示搜尋建議
    showSuggestions(tags, userInput);
}

function editDistance(word1, word2) {
    const dp = Array(word1.length+1).fill(null).map(()=>(Array(word2.length+1).fill(0)));
    for (let i=0;i<dp.length;i++) dp[i][0] = i;
    for (let i=0;i<dp[0].length;i++) dp[0][i] = i;
    for (let i = 1;i<dp.length;i++) {
        for (let j=1;j<dp[0].length;j++) {
            dp[i][j] = Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1] + (word1[i-1]!=word2[j-1]?1:0));
        }
    }
    return dp[dp.length-1][dp[0].length-1];
};

// 如果使用者選擇任何建議，就觸發這個函式
function select(event) {
    // 新增對應的 tag
    addTag(event.target.dataset.value);
    // 清空搜尋框與搜尋建議
    searchInput.value = "";
    clearSuggestions();
}

// 清空搜尋建議
function clearSuggestions() {
    searchArea.classList.remove("show-suggestions");
    suggestionsList.innerHTML = "";
}

// 顯示搜尋建議
function showSuggestions(tags, userInput) {
    // 清空可能存在的建議(?)
    suggestionsList.innerHTML = "";

    // 用 LCS 判斷搜尋建議
    const suggestions = tags.map((tag) => [editDistance(tag.toLocaleLowerCase(), userInput.toLocaleLowerCase()), tag])
                          .sort((a, b) => a[0] - b[0])
                          .slice(0, 3)
                          .map((data) => data[1]);

    // 加入搜尋建議
    suggestions.forEach((tag) => {
        const suggestion = document.createElement("li");
        suggestion.innerHTML = tag;
        suggestion.dataset.value = tag;
        suggestion.addEventListener("click", select);
        suggestionsList.appendChild(suggestion);
    });

    // 如果使用者輸入不在搜尋建議中，就新增這個輸入
    if (!suggestions.includes(userInput)) {
        const newTag = document.createElement("li");
        newTag.innerHTML = `Add "${userInput}"`;
        newTag.dataset.value = userInput;
        newTag.addEventListener("click", select);
        suggestionsList.appendChild(newTag);
    }

    searchArea.classList.add("show-suggestions"); 
}

function createElementByHTML(htmlString) {
    const ele = document.createElement("div");
    ele.innerHTML = htmlString;
    return ele.firstChild;
}

// 新增 tag
function addTag(tag) {
    let tags = [...currentTags.querySelectorAll(".tag")].map((elem) => elem.innerHTML); // 現有的 tag

    // 如果已經有了，就不再新增
    if (tags.includes(tag)) return;
    
    let tagHTML = document.createElement("span");
    tagHTML.innerHTML = tag;
    tagHTML.classList.add("tag");
    tagHTML.addEventListener("click", (event) => {
        // 消失動畫
        event.target.animate([
            {
                maxWidth: `${event.target.offsetWidth}px`,
                paddingLeft: "auto",
                paddingRight: "auto",
                opacity: 1
            },
            {
                maxWidth: 0,
                paddingLeft: 0,
                paddingRight: 0,
                opacity: 0
            }
        ], {
            duration: 200,
            easing: "ease-in-out",
            fill: "forwards",
        }).finished.then(() => {
            currentTags.removeChild(event.target);
        });
    });
    currentTags.appendChild(tagHTML);
    // 出現動畫
    tagHTML.animate([
        {
            maxWidth: 0,
            paddingLeft: 0,
            paddingRight: 0,
            opacity: 0
        },
        {
            maxWidth: `${tagHTML.offsetWidth}px`,
            paddingLeft: "auto",
            paddingRight: "auto",
            opacity: 1
        }
    ], {
        duration: 200,
        easing: "ease-in-out",
        fill: "forwards",
    });
}

// 如果使用者按下儲存按鈕，就觸發這個函式
function save(event, url, problems) {
    let tags = [...currentTags.querySelectorAll(".tag")].map((elem) => elem.innerHTML); // 要記錄的 tag
    problems[url] = {
        tags: tags,
        name: nameInput.value,
        difficulty: difficultyInput.value,
        comment: commentInput.value
    };

    // 儲存紀錄並關閉小視窗
    chromeStorage.set({ "problems" : problems }).then(() => {
        console.log(`The tags of ${url} is now ${tags}`);
        window.close();
    });
}