import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { CONTROL_TREE } from './userControls';

const DELETE_PATTERN = /\b(delete|remove)\b/i;
const MODIFY_PATTERN = /\b(edit|update|save|add|submit|create|import|upload|restore|receiv\w*|approve|reject|apply|modify|assign|enter)\b/i;
const NEUTRAL_PATTERN = /\b(cancel|close|copy|download|search|filter|back|show|hide|clear|reset filters?|print|export)\b/i;

const ribbonIds = CONTROL_TREE.flatMap(({ children }) => children.map(([id]) => id))
  .sort((a, b) => b.length - a.length);

export const ribbonForPath = (pathname) => {
  const path = pathname.replace(/^\//, '');
  return ribbonIds.find((id) => path === id || path.startsWith(`${id}/`)) || null;
};

export const modifyKey = (key) => `__m__${key}`;
export const deleteKey = (key) => `__d__${key}`;

const labelOf = (element) => [
  element.textContent,
  element.getAttribute('aria-label'),
  element.getAttribute('title'),
  element.value,
].filter(Boolean).join(' ').trim();

const classify = (element) => {
  if (element.tagName === 'INPUT' && element.type === 'file') return 'modify';
  const label = labelOf(element);
  if (!label || NEUTRAL_PATTERN.test(label)) return null;
  if (DELETE_PATTERN.test(label)) return 'delete';
  if (MODIFY_PATTERN.test(label) || (element.type === 'submit' && element.closest('form'))) return 'modify';
  return null;
};

// Restricts edit/delete controls inside a ribbon page to users who hold the matching permission.
function ActionGuard({ canModify, canDelete, children }) {
  const containerRef = useRef(null);
  const { pathname } = useLocation();
  const ribbon = ribbonForPath(pathname);
  const canModifyHere = !ribbon || canModify(ribbon);
  const canDeleteHere = !ribbon || canDelete(ribbon);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || (canModifyHere && canDeleteHere)) return undefined;

    const isBlocked = (element) => {
      const kind = classify(element);
      return (kind === 'modify' && !canModifyHere) || (kind === 'delete' && !canDeleteHere);
    };
    const apply = () => {
      container.querySelectorAll('button, input[type="submit"], input[type="file"]').forEach((element) => {
        if (isBlocked(element)) {
          element.dataset.guarded = 'true';
          element.setAttribute('aria-disabled', 'true');
          element.style.opacity = '0.4';
          element.style.cursor = 'not-allowed';
          element.title = 'You do not have permission for this action';
        } else if (element.dataset.guarded) {
          delete element.dataset.guarded;
          element.removeAttribute('aria-disabled');
          element.style.opacity = '';
          element.style.cursor = '';
        }
      });
    };
    const block = (event) => {
      const target = event.target.closest?.('button, input[type="submit"], input[type="file"]');
      if (target && target.dataset.guarded) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const blockSubmit = (event) => {
      const submitter = event.submitter;
      if (submitter?.dataset.guarded) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(container, { childList: true, subtree: true, characterData: true });
    container.addEventListener('click', block, true);
    container.addEventListener('submit', blockSubmit, true);
    return () => {
      observer.disconnect();
      container.removeEventListener('click', block, true);
      container.removeEventListener('submit', blockSubmit, true);
    };
  }, [canModifyHere, canDeleteHere, pathname]);

  return (
    <div ref={containerRef} className="h-full min-h-0 w-full min-w-0 flex-1 overflow-hidden">
      {children}
    </div>
  );
}

export default ActionGuard;
