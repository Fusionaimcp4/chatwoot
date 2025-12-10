import { addClasses, removeClasses, toggleClass } from './DOMHelpers';
import { IFrameHelper } from './IFrameHelper';
import { isExpandedView } from './settingsHelper';
import {
  CHATWOOT_CLOSED,
  CHATWOOT_OPENED,
} from '../widget/constants/sdkEvents';
import { dispatchWindowEvent } from 'shared/helpers/CustomEventHelper';

export const bubbleSVG =
  'm139 55.47c-5.22 0.77-14.9 2.57-21.5 4.01-6.6 1.43-16.72 4.2-22.5 6.14-5.78 1.95-13.65 5.36-17.5 7.59-3.85 2.23-8.95 5.9-11.33 8.17-2.39 2.27-5.43 6.26-6.75 8.87-1.5 2.94-2.42 6.47-2.42 9.25 0 2.47 0.45 5.63 1 7 0.55 1.38 1.67 2.5 2.5 2.5 0.83 0 2.51-2.1 3.75-4.67 1.38-2.87 3.79-5.71 6.25-7.36 2.2-1.48 5.8-3.6 8-4.7 2.2-1.09 7.6-3.16 12-4.58 4.4-1.43 10.92-3.33 14.5-4.23 3.58-0.9 11.67-2.5 18-3.55 6.32-1.05 14.31-1.91 17.75-1.91 3.56 0 7.54 0.65 9.25 1.5 1.65 0.83 3.52 2.51 4.16 3.75 0.76 1.48 1.19 9.35 1.25 22.92l0.09 20.67c-3.88 3.98-6.8 5.57-9 6.1-2.2 0.53-9.29 1.66-15.75 2.51-6.46 0.85-15.69 2.44-20.5 3.52-4.81 1.08-12.8 3.08-17.75 4.43-4.95 1.36-12.38 3.91-16.5 5.66-4.13 1.75-9.15 4.37-11.16 5.81-2.01 1.45-4.59 3.98-5.73 5.63-1.14 1.65-2.08 4.57-2.09 6.5-0.01 2.51 0.84 4.42 2.98 6.75 1.72 1.87 5.45 4.15 8.75 5.36 3.16 1.15 9.8 2.98 14.75 4.05 6.48 1.4 15.86 2.19 33.5 2.85 13.47 0.49 33.16 0.92 43.75 0.95 11.88 0.02 19.44-0.34 19.75-0.96 0.28-0.55 0.05-2.12-0.5-3.5-0.55-1.37-2.01-3.06-3.25-3.75-1.64-0.91-13.08-1.41-42.25-1.84-32.11-0.48-41.58-0.93-48-2.29-4.4-0.94-9.3-2.47-10.89-3.41-1.6-0.94-3.4-2.52-4-3.5-0.91-1.47-0.65-2.14 1.39-3.71 1.38-1.06 5.42-3.02 9-4.36 3.58-1.34 11.22-3.58 17-4.96 5.78-1.39 14.55-3.21 19.5-4.05 4.95-0.84 13.5-2.04 19-2.68 5.5-0.63 12.81-1.78 16.25-2.55 3.44-0.77 8.8-2.64 11.92-4.15 3.33-1.62 7.25-4.61 9.51-7.25 3.18-3.74 4.02-5.68 4.94-11.5 0.71-4.46 0.92-15.35 0.58-30-0.29-12.65-0.89-24.35-1.33-26-0.45-1.65-2.17-4.3-3.84-5.88-1.67-1.58-4.38-3.57-6.03-4.4-1.84-0.94-6.49-1.65-12-1.83-4.95-0.17-13.28 0.32-18.5 1.08zm-28.5 43.51c-2.75 0.44-8.6 1.73-13 2.88-4.4 1.15-11.15 3.25-15 4.66-3.85 1.42-9.03 3.88-11.5 5.47-2.47 1.59-5.94 4.39-7.7 6.2-1.76 1.82-3.9 5-4.75 7.06-0.85 2.06-1.56 5.66-1.57 8-0.01 2.34 0.44 5.71 1 7.5 0.56 1.79 1.69 3.25 2.52 3.25 0.83 0 2.58-1.91 3.9-4.25 1.32-2.34 3.69-5.19 5.25-6.35 1.57-1.15 4.88-3.13 7.35-4.38 2.47-1.26 8.78-3.58 14-5.16 5.22-1.58 14.56-3.77 20.75-4.86 6.19-1.1 11.47-2 11.75-2 0.28 0 0.52-3.49 0.54-7.75 0.03-5.11-0.39-8.16-1.25-8.95-0.71-0.66-2.64-1.41-4.29-1.66-1.65-0.25-5.25-0.1-8 0.34z';

export const body = document.getElementsByTagName('body')[0];
export const widgetHolder = document.createElement('div');

export const bubbleHolder = document.createElement('div');
export const chatBubble = document.createElement('button');
export const closeBubble = document.createElement('button');
export const notificationBubble = document.createElement('span');

export const setBubbleText = bubbleText => {
  if (isExpandedView(window.$chatwoot.type)) {
    const textNode = document.getElementById('woot-widget--expanded__text');
    textNode.innerText = bubbleText;
  }
};

export const createBubbleIcon = ({ className, path, target }) => {
  let bubbleClassName = `${className} woot-elements--${window.$chatwoot.position}`;
  const bubbleIcon = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'svg'
  );
  bubbleIcon.setAttributeNS(null, 'id', 'woot-widget-bubble-icon');
  bubbleIcon.setAttributeNS(null, 'width', '16');
  bubbleIcon.setAttributeNS(null, 'height', '16');
  bubbleIcon.setAttributeNS(null, 'viewBox', '0 0 240 240');
  bubbleIcon.setAttributeNS(null, 'fill', 'none');
  bubbleIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  const bubblePath = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'path'
  );
  bubblePath.setAttributeNS(null, 'd', path);
  bubblePath.setAttributeNS(null, 'fill', '#FFFFFF');

  bubbleIcon.appendChild(bubblePath);
  target.appendChild(bubbleIcon);

  if (isExpandedView(window.$chatwoot.type)) {
    const textNode = document.createElement('div');
    textNode.id = 'woot-widget--expanded__text';
    textNode.innerText = '';
    target.appendChild(textNode);
    bubbleClassName += ' woot-widget--expanded';
  }

  target.className = bubbleClassName;
  target.title = 'Open chat window';
  return target;
};

export const createBubbleHolder = hideMessageBubble => {
  if (hideMessageBubble) {
    addClasses(bubbleHolder, 'woot-hidden');
  }
  addClasses(bubbleHolder, 'woot--bubble-holder');
  bubbleHolder.id = 'cw-bubble-holder';
  bubbleHolder.dataset.turboPermanent = true;
  body.appendChild(bubbleHolder);
};

const handleBubbleToggle = newIsOpen => {
  IFrameHelper.events.onBubbleToggle(newIsOpen);

  if (newIsOpen) {
    dispatchWindowEvent({ eventName: CHATWOOT_OPENED });
  } else {
    dispatchWindowEvent({ eventName: CHATWOOT_CLOSED });
    chatBubble.focus();
  }
};

export const onBubbleClick = (props = {}) => {
  const { toggleValue } = props;
  const { isOpen } = window.$chatwoot;
  if (isOpen === toggleValue) return;

  const newIsOpen = toggleValue === undefined ? !isOpen : toggleValue;
  window.$chatwoot.isOpen = newIsOpen;

  toggleClass(chatBubble, 'woot--hide');
  toggleClass(closeBubble, 'woot--hide');
  toggleClass(widgetHolder, 'woot--hide');

  handleBubbleToggle(newIsOpen);
};

export const onClickChatBubble = () => {
  bubbleHolder.addEventListener('click', onBubbleClick);
};

export const addUnreadClass = () => {
  const holderEl = document.querySelector('.woot-widget-holder');
  addClasses(holderEl, 'has-unread-view');
};

export const removeUnreadClass = () => {
  const holderEl = document.querySelector('.woot-widget-holder');
  removeClasses(holderEl, 'has-unread-view');
};
