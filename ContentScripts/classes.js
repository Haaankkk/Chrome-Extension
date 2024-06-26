
class RedirectAction {
    constructor(url) {
        this.url = url;
    }

    static getPath() {
        return null
    }

    static isRedirectCompleted(redirect) {
        return (!isStringEmpty(redirect.url));
    }
}




class ClickAction {
    constructor(clicks = []) {
        this.clicks = clicks
    }

    static getDefaultClick(clickAction) {
        return clickAction?.clicks[0]
    }

    static getPath(clickAction, index = 0) {
        if (isArrayEmpty(clickAction?.clicks)) return null
        return clickAction?.clicks[index]?.path
    }

    static isClickActionCompleted(click) {
        return ClickGuide.isClickGuideCompleted(this.clicks[0]);
    }
}


/**
 * Helper class to wrap what to do during one click action step. Used in ClickAction
 */
class ClickGuide {
    /**
     * 
     * @param {[string]} path 
     * @param {string} name 
     * @param {string} description 
     * @param {boolean} isRedirect
     * @param {string} url
     */
    constructor(path, name, description, isRedirect, url, useAnythingInTable, table) {
        this.path = path;
        this.name = name;
        this.description = description;
        this.isRedirect = isRedirect;
        this.url = url;
        this.useAnythingInTable = useAnythingInTable;
        this.table = table;
    }

    static isClickGuideCompleted(clickGuide) {
        return (
            isNotNull(clickGuide) &&
            !isArrayEmpty(clickGuide.path) &&
            !isStringEmpty(clickGuide.name) &&
            !isStringEmpty(clickGuide.description) &&
            isNotNull(clickGuide.isRedirect))
    }
}



class InputAction {
    constructor(path, inputTexts, inputType, regexRule) {
        this.path = path;
        this.inputTexts = inputTexts;
        this.inputType = inputType;
        this.regexRule = regexRule
    }

    static getPath(inputAction) {
        return inputAction?.path
    }

    static isInputCompleted(input) {
        return (!isArrayEmpty(input.path) && !isStringEmpty(input.inputTexts));
    }
}



class SelectAction {
    /**
     * 
     * @param {[string]} path path to the <select> element. not option
     * @param {string} defaultValue html value attribute, from VALUE.ACTION_TYPE
     */
    constructor(path, selections) {
        this.path = path;
        this.selections = selections;
    }

    static getPath(selectAction) {
        return selectAction?.path
    }

    static isSelectCompleted(select) {
        return (!isArrayEmpty(select.path) && !isArrayEmpty(select.selections))
    }
}




class SideInstructionAction {
    constructor(path) {
        this.path = path;
    }

    static getPath(actionObject) {
        return actionObject?.path
    }

    static isSideInstructionCompleted(si) {
        return (!isArrayEmpty(si.path))
    }
}



class UserEventListnerHandler {
    /**
     * Set by specific view controllers.
     * Should contain variables: 
     * And methods: onClick(), checkIfShouldProcessEvent(event), checkIfShouldPreventDefault(event)
     */
    static userEventListnerHandlerDelegate
    static isLisenting = false;

    //global status that determine if listeners should be added or removed
    static isAutomationInterrupt = false;
    static isOnRightPage = true;
    static tutorialStatusCache = VALUES.TUTORIAL_STATUS.BEFORE_INIT_NULL;
    static recordingIsHighlighting = false

    static setTutorialStatusCache(tutorialStatusCache) {
        syncStorageSet(VALUES.TUTORIAL_STATUS.STATUS, tutorialStatusCache);
        UserEventListnerHandler.tutorialStatusCache = tutorialStatusCache;
        UserEventListnerHandler.#onChange();
    }

    static setRecordingIsHighlighting(recordingIsHighlighting) {
        UserEventListnerHandler.recordingIsHighlighting = recordingIsHighlighting;
        UserEventListnerHandler.#onChange();
    }

    static setIsAutomationInterrupt(isAutomationInterrupt) {
        UserEventListnerHandler.isAutomationInterrupt = isAutomationInterrupt;
        UserEventListnerHandler.#onChange();
    }

    static setIsOnRightPage(isOnRightPage) {
        UserEventListnerHandler.isOnRightPage = isOnRightPage;
        UserEventListnerHandler.#onChange();
    }



    static #onChange() {
        //add or remove when recording or not recording
        if (UserEventListnerHandler.recordingIsHighlighting) {
            if (!UserEventListnerHandler.isLisenting) {
                UserEventListnerHandler.#addGlobalEventListeners();
                UserEventListnerHandler.isLisenting = true;
            }
        } else {
            if (UserEventListnerHandler.isLisenting) {
                UserEventListnerHandler.#removeGlobalEventListeners();
                UserEventListnerHandler.isLisenting = false;
            }
        }

        if (UserEventListnerHandler.isOnRightPage && (UserEventListnerHandler.isAutomationInterrupt || isManualFollowingTutorial() || isFollowingOtherTutorial())) {
            if (!UserEventListnerHandler.isLisenting) {
                UserEventListnerHandler.#addGlobalEventListeners();
                UserEventListnerHandler.isLisenting = true;
            }
        } else {
            if (UserEventListnerHandler.isLisenting) {
                UserEventListnerHandler.#removeGlobalEventListeners();
                UserEventListnerHandler.isLisenting = false;
            }
        }

        if (DEBUG_OPTION & VALUES.DEBUG_MASKS.DEBUG_LOGGING) {
            if (isRecordingTutorial() || isAutoFollowingTutorial() || isManualFollowingTutorial() || isFollowingOtherTutorial()) {
                if (!UserEventListnerHandler.isLisenting) {
                    UserEventListnerHandler.#addGlobalEventListeners();
                    UserEventListnerHandler.isLisenting = true;
                }
            } else {
                if (UserEventListnerHandler.isLisenting) {
                    UserEventListnerHandler.#removeGlobalEventListeners();
                    UserEventListnerHandler.isLisenting = false;
                }
            }
        }
    }

    static #addGlobalEventListeners() {
        // $('*').on('blur focus focusin focusout load resize scroll unload dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error',
        //     UserEventListnerHandler.#preventDefaultHelper);
        // $('*').on('click', UserEventListnerHandler.#onClickHelper);
        //neew solution from: https://stackoverflow.com/questions/1755815/disable-all-click-events-on-page-javascript
        document.addEventListener("click", UserEventListnerHandler.#clickListener, true);
    }

    static #removeGlobalEventListeners() {
        document.removeEventListener("click", UserEventListnerHandler.#clickListener, true);
    }


    static #clickListener(event) {
        UserEventListnerHandler.#preventDefaultHelper(event);
        if (UserEventListnerHandler.userEventListnerHandlerDelegate.checkIfShouldProcessEvent(event)) {
            UserEventListnerHandler.#processEventHelper(event.target);
        }
        UserEventListnerHandler.#logHelper(event.target)
    }

    static #logHelper(target) {
        switch (UserEventListnerHandler.tutorialStatusCache) {
            case VALUES.TUTORIAL_STATUS.IS_RECORDING:
                const dialogContainer = document.getElementById('w-dialog-container')
                const recordingPanelContainer = document.getElementById('w-recording-panel-container')
                if (!aContainsOrIsBNode(target, recordingPanelContainer) &&
                    !(dialogContainer && aContainsOrIsBNode(target, dialogContainer))) {
                    UserActionLogger.log(UserActionLogger.ACTION_TYPE.RECORDING.HIGHLIGHT, { element: getShortDomPathStack(target), isHighlighting: UserEventListnerHandler.recordingIsHighlighting })
                }

                break;
            case VALUES.TUTORIAL_STATUS.IS_AUTO_FOLLOWING_TUTORIAL:
                //UserActionLogger.log(UserActionLogger.ACTION_TYPE.RECORDING.HIGHLIGHT, { element: getShortDomPathStack(event.target), isHighlighting: UserEventListnerHandler.recordingIsHighlighting })
                break;
            case VALUES.TUTORIAL_STATUS.IS_MANUALLY_FOLLOWING_TUTORIAL:
                UserActionLogger.log(UserActionLogger.ACTION_TYPE.FOLLOWING.CLICK, { element: getShortDomPathStack(target) })
                break;
            case VALUES.TUTORIAL_STATUS.IS_FOLLOWING_OTHER_TUTORIAL:
                UserActionLogger.log(UserActionLogger.ACTION_TYPE.FOLLOWING.CLICK, { element: getShortDomPathStack(target) })
                break;
            default:
                break;
        }
    }

    static #processEventHelper(target) {
        globalCache.domPath = getShortDomPathStack(target);
        if ($(jqueryElementStringFromDomPath(globalCache.domPath)).length > 1) {
            globalCache.domPath = getCompleteDomPathStack(target);
        }
        console.log(`clicking: ${globalCache.domPath}`);

        globalCache.currentElement = target;
        UserEventListnerHandler.userEventListnerHandlerDelegate.onClick()
    }

    static #preventDefaultHelper(event) {
        if (UserEventListnerHandler.userEventListnerHandlerDelegate.checkIfShouldPreventDefault(event)) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            return false
        }
    }
}

class GlobalCache {
    constructor() {
        this.domPath = null
        this.currentElement = null
        this.reHighlightAttempt = 0
        this.currentUrl = $(location).attr('href');
        //c(this.currentUrl)
        this.currentURLObj = new URL(this.currentUrl);
    }


}