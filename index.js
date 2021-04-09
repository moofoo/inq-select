const { createPrompt, useState, useKeypress, useRef } = require('@inquirer/core/hooks');
const { usePrefix } = require('@inquirer/core/lib/prefix');
const { isEnterKey, isUpKey, isDownKey, isNumberKey } = require('@inquirer/core/lib/key');
const Paginator = require('@inquirer/core/lib/Paginator');
const chalk = require('chalk');
const figures = require('figures');
const { cursorHide } = require('ansi-escapes');

module.exports = createPrompt((config, done) => {
  const [status, setStatus] = useState('pending');
  const [cursorPosition, setCursorPos] = useState(0);
  const { choices, pageSize = 7 } = config;
  const paginator = useRef(new Paginator()).current;
  const prefix = usePrefix();

  const keypressCb = config.keypressCb;
  const cursorCb = config.cursorCb;
  const hideOnDone = config.hideOnDone;

  useKeypress((key) => {

    keypressCb({
      key,
      isEnterKey: isEnterKey(key),
      isUpKey: isUpKey(key),
      isDownKey: isDownKey(key),
    });

    if (isEnterKey(key)) {
      setStatus('done');
      done(choices[cursorPosition].value);
    } else if (isUpKey(key) || isDownKey(key)) {
      let newCursorPosition = cursorPosition;
      const offset = isUpKey(key) ? -1 : 1;
      let selectedOption;

      while (!selectedOption || selectedOption.disabled) {
        newCursorPosition =
          (newCursorPosition + offset + choices.length) % choices.length;
        selectedOption = choices[newCursorPosition];
      }

      setCursorPos(newCursorPosition);
      cursorCb(newCursorPosition);
    } else if (isNumberKey(key)) {
      // Adjust index to start at 1
      const newCursorPosition = Number(key.name) - 1;

      // Abort if the choice doesn't exists or if disabled
      if (!choices[newCursorPosition] || choices[newCursorPosition].disabled) {
        return;
      }

      setCursorPos(newCursorPosition);
      cursorCb(newCursorPosition);
    }
  });

  const message = chalk.bold(config.message);

  if (status === 'done') {
    if(hideOnDone){
      return '';
    }else {
      const choice = choices[cursorPosition];
      return `${prefix} ${message} ${chalk.cyan(choice.name || choice.value)}`;
    }
  }

  const allChoices = choices
    .map(({ name, value, disabled }, index) => {
      const line = name || value;
      if (disabled) {
        return chalk.dim(`- ${line} (disabled)`);
      }

      if (index === cursorPosition) {
        return chalk.cyan(`${figures.pointer} ${line}`);
      }

      return `  ${line}`;
    })
    .join('\n');
  const windowedChoices = paginator.paginate(allChoices, cursorPosition, pageSize);

  const choice = choices[cursorPosition];
  const choiceDescription = choice && choice.description ? `\n${choice.description}` : ``;

  return `${prefix} ${message}\n${windowedChoices}${choiceDescription}${cursorHide}`;
});
