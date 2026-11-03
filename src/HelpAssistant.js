import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

// Built-in guide. Each entry is matched by keyword score; no external service is used.
const GUIDE = [
  {
    title: 'BOM Entry: components and child materials',
    keywords: ['bom', 'component', 'child', 'child material', 'finished upper', 'dropdown', 'no child material'],
    answer: 'In BOM Entry, open an article and add one row per component: Function, SAP Material No, Component Details, Child Material, Qty/PR and Unit. The Child Material dropdown lists "No Child Material", the other components of the same article (unique names only) and the stock materials. Tick the children that make up the component. A Stitching component needs at least one Clicking child; a Printing child is optional.',
  },
  {
    title: 'BOM incomplete notification',
    keywords: ['bom incomplete', 'notification', 'error', 'no clicking', 'stitching', 'bell'],
    answer: 'The "BOM incomplete" notification means a Stitching component has no Clicking component ticked as its child. Open BOM Entry, find that Stitching row and tick at least one component whose Function is Clicking in its Child Material dropdown. Printing children are optional.',
  },
  {
    title: 'BOM Excel template download and upload',
    keywords: ['template', 'excel', 'upload', 'import', 'download', 'bom', 'qty/pr', 'multiple'],
    answer: 'Select the articles in BOM Entry and download the template. Each article gets its own sheet with Functions, SAP Material No, Components, Child Material SAP No, Child Material, Qty/PR and Unit. Pick the child in the Child Material dropdown ("No Child Material" is available), fill the sheet and upload it. Several rows for the same component with different child materials are all imported.',
  },
  {
    title: 'User permissions (View / Modify / Delete)',
    keywords: ['permission', 'user control', 'view', 'modify', 'delete', 'access', 'tick', 'role'],
    answer: 'In User Control an admin ticks View, Modify and Delete for each ribbon per user. View is on by default. Only users with Modify can edit or submit in a stage, and only users with Delete can delete. Ticking a column header selects the whole column.',
  },
  {
    title: 'Clicking Plan: requirements sheet',
    keywords: ['clicking', 'requirement', 'requirements sheet', 'price category', 'colour', 'color', 'size', 'grid code', 'planning'],
    answer: 'The Clicking Plan Requirements sheet takes colour from the BOR colour column and size from the BOR grid code (trimmed at the first space from the right, e.g. 06X10BB). Price Category comes from the Article Entry by matching article, model, colour and gender, using the value that starts with P. Submitted plans store that Price Category in the CATEGORY column.',
  },
  {
    title: 'Receiving: RECEIVED and UPDATE RECEIVING',
    keywords: ['receiving', 'received', 'update receiving', 'checked date', 'planning store', 'actual store', '90', 'execution'],
    answer: 'In each Execution ribbon press RECEIVED in the Receiving Status column, choose the date (today by default) and submit. The status becomes RECEIVED and 90% of each size quantity is placed in the Planning Store. When you later submit UPDATE RECEIVING with the Checked Date and actual values, the quantities move to the Actual Store and the planned stock is deleted.',
  },
  {
    title: 'Actual Store and Planning Store',
    keywords: ['store', 'actual store', 'planning store', 'fiu', 'clicker comp', 'printing comp', 'stock'],
    answer: 'Actual Store holds the real received stock for Clicker Comp, Printing Comp, FIU (Stitching) and the other stores. Planning Store mirrors the same ribbons and shows the planned 90% stock, read-only, until UPDATE RECEIVING moves the actual values to the Actual Store.',
  },
  {
    title: 'Stage plans (Printing, Stitching, Molding, Grinding, Stuckon, Packing)',
    keywords: ['printing plan', 'stitching plan', 'molding', 'grinding', 'stuckon', 'packing', 'stage', 'plan'],
    answer: 'These stage plans work like the Clicking Plan: pick requirements, set the plan code and date, submit, then track the plan under Execution. Previous plans are listed in the matching "Previous" ribbon.',
  },
  {
    title: 'Requirement entry',
    keywords: ['requirement entry', 'nlmto', 'ribbon', 'requirement', 'scroll', 'upload'],
    answer: 'Requirements are entered in six category ribbons under Admin Desk, such as NLMTO. Each sheet scrolls horizontally and vertically, so wide data can be viewed in full.',
  },
  {
    title: 'Damage and repair tracking',
    keywords: ['damage', 'repair', 'defect', 'rework'],
    answer: 'Stage damage and repair quantities are tracked from the stage plans and reported under Analysis > Stage Defect Details.',
  },
  {
    title: 'Sign up and approval',
    keywords: ['signup', 'sign up', 'login', 'approve', 'approval', 'password', 'reset', 'forgot'],
    answer: 'New users sign up and wait for an admin to approve them in User Request. Use "Forgot password" on the login page to reset a password.',
  },
];

const STOP_WORDS = new Set(['the', 'a', 'an', 'is', 'are', 'to', 'of', 'in', 'on', 'for', 'how', 'do', 'i', 'what', 'where', 'can', 'my', 'it', 'and', 'or', 'this', 'that', 'me', 'does', 'with']);

const tokenize = (text) => String(text || '').toLowerCase().split(/[^a-z0-9/]+/).filter((word) => word && !STOP_WORDS.has(word));

const PAGE_HINTS = [
  ['bom', 'How do I set up child materials in BOM Entry?'],
  ['clicking', 'How is the Clicking Plan requirements sheet filled?'],
  ['store', 'What is the difference between Actual Store and Planning Store?'],
  ['user-control', 'How do View, Modify and Delete permissions work?'],
  ['plan', 'How does RECEIVED and UPDATE RECEIVING work?'],
];

export const answerQuestion = (question) => {
  const queryText = String(question || '').toLowerCase();
  const words = tokenize(question);
  if (!words.length) return null;
  const scored = GUIDE.map((entry) => {
    let score = 0;
    entry.keywords.forEach((keyword) => {
      if (queryText.includes(keyword)) score += keyword.includes(' ') ? 3 : 2;
      else if (words.some((word) => keyword.split(' ').includes(word))) score += 1;
    });
    return { entry, score };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
  return scored.length ? scored.slice(0, 2).map((item) => item.entry) : null;
};

function HelpAssistant() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Hi, I am the NOVA assistant. Ask me how any sheet, ribbon or button in the workspace works.' },
  ]);
  const endRef = useRef(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const suggestion = useMemo(() => {
    const path = location.pathname.toLowerCase();
    return PAGE_HINTS.find(([key]) => path.includes(key))?.[1] || 'How do View, Modify and Delete permissions work?';
  }, [location.pathname]);

  const ask = (question) => {
    const text = question.trim();
    if (!text) return;
    const matches = answerQuestion(text);
    const reply = matches
      ? matches.map((entry) => `${entry.title}\n${entry.answer}`).join('\n\n')
      : 'I could not find that in my guide. Try words like BOM, child material, clicking plan, receiving, store, permissions or template.';
    setMessages((current) => [...current, { from: 'user', text }, { from: 'bot', text: reply }]);
    setInput('');
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <div className="mb-2 flex h-96 w-80 flex-col overflow-hidden rounded-lg border border-gray-300 bg-white shadow-xl" role="dialog" aria-label="NOVA assistant">
          <div className="flex items-center justify-between bg-blue-600 px-3 py-2 text-sm font-semibold text-white">
            <span>NOVA Assistant</span>
            <button type="button" aria-label="Close assistant" onClick={() => setOpen(false)} className="px-1 text-lg leading-none">×</button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
            {messages.map((message, index) => (
              <div key={index} className={message.from === 'user' ? 'text-right' : 'text-left'}>
                <div className={`inline-block max-w-full whitespace-pre-wrap rounded px-2 py-1 text-left ${message.from === 'user' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  {message.text}
                </div>
              </div>
            ))}
            <button type="button" onClick={() => ask(suggestion)} className="rounded border border-blue-300 px-2 py-1 text-left text-xs text-blue-700 hover:bg-blue-50">
              {suggestion}
            </button>
            <div ref={endRef} />
          </div>
          <form
            className="flex gap-2 border-t border-gray-200 p-2"
            onSubmit={(event) => { event.preventDefault(); ask(input); }}
          >
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about the workspace..."
              aria-label="Ask the assistant"
              className="min-w-0 flex-1 rounded border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <button type="submit" className="rounded bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700">ASK</button>
          </form>
        </div>
      )}
      <button
        type="button"
        aria-label="Open assistant"
        onClick={() => setOpen((current) => !current)}
        className="ml-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white shadow-lg hover:bg-blue-700"
      >
        ?
      </button>
    </div>
  );
}

export default HelpAssistant;
