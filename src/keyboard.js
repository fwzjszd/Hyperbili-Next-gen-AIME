/******************************************************************************
 * keyboard.js
 * 基于 useful.js 的 initKeyboard 适配，为全屏输入页提供光标/选区/剪贴板能力。
 * 与 useful.js 的区别：去掉了 DOM 滚动定位（$element/scrollBy），
 * 因为全屏输入组件没有 scroll 容器，输入框始终可见。
 * textParts 模型固定使用单字段 'content'。
 *****************************************************************************/

export function initKeyboard(vm) {
  vm.getCursorPosition = function () {
    const parts = this.textParts[this.currentField]
    return parts ? parts[0].length : 0
  }

  vm.setCursorPosition = function (position) {
    const parts = this.textParts[this.currentField]
    if (!parts) return
    const fullText = parts.join('')
    const safePos = Math.max(0, Math.min(position, fullText.length))
    parts[0] = fullText.slice(0, safePos)
    parts[1] = fullText.slice(safePos)
  }

  vm.getSelectedText = function () {
    if (this.anchor === null) return null
    const parts = this.textParts[this.currentField]
    if (!parts) return null
    const cursorPos = parts[0].length
    const anchorPos = this.anchor
    const start = Math.min(anchorPos, cursorPos)
    const end = Math.max(anchorPos, cursorPos)
    const fullText = parts.join('')
    return { text: fullText.slice(start, end), start, end }
  }

  vm.getDisplayText = function (field) {
    const parts = this.textParts[field]
    if (!parts) return ''
    const fullText = parts.join('')
    if (this.currentField === field && this.anchor !== null) {
      const cursorPos = parts[0].length
      const anchorPos = this.anchor
      const start = Math.min(anchorPos, cursorPos)
      const end = Math.max(anchorPos, cursorPos)
      return fullText.slice(0, start) + '[' + fullText.slice(start, end) + ']' + fullText.slice(end)
    }
    if (this.currentField === field) {
      return parts[0] + '|' + parts[1]
    }
    return fullText
  }

  vm.onInputComplete = function (evt) {
    this.anchor = null
    this.preferredColumn = -1
    this.textParts[this.currentField][0] += evt.detail.content
  }

  vm.onInputDelete = function () {
    const parts = this.textParts[this.currentField]
    if (!parts) return
    const selection = this.getSelectedText()
    if (selection) {
      const fullText = parts.join('')
      parts[0] = fullText.slice(0, selection.start)
      parts[1] = fullText.slice(selection.end)
      this.anchor = null
      return
    }
    if (parts[0].length > 0) {
      parts[0] = parts[0].slice(0, -1)
    }
  }

  vm.onCursorMove = function (direction) {
    const parts = this.textParts[this.currentField]
    if (!parts) return
    const getLastLinePrefix = (text) => {
      const lastNl = text.lastIndexOf('\n')
      return lastNl === -1 ? text : text.slice(lastNl + 1)
    }
    switch (direction) {
      case 'left':
        this.preferredColumn = -1
        if (parts[0].length > 0) {
          parts[1] = parts[0].slice(-1) + parts[1]
          parts[0] = parts[0].slice(0, -1)
        }
        break
      case 'right':
        this.preferredColumn = -1
        if (parts[1].length > 0) {
          parts[0] += parts[1].slice(0, 1)
          parts[1] = parts[1].slice(1)
        }
        break
      case 'up': {
        const currLineStart = parts[0].lastIndexOf('\n')
        const currLinePrefix = getLastLinePrefix(parts[0])
        if (this.preferredColumn === -1) this.preferredColumn = currLinePrefix.length
        if (currLineStart === -1) {
          parts[1] = parts[0] + parts[1]
          parts[0] = ''
        } else {
          const prevPart = parts[0].slice(0, currLineStart)
          const prevLineStart = prevPart.lastIndexOf('\n')
          const prevLine = prevLineStart === -1 ? prevPart : prevPart.slice(prevLineStart + 1)
          const offset = Math.min(this.preferredColumn, prevLine.length)
          parts[0] = (prevLineStart === -1 ? '' : prevPart.slice(0, prevLineStart + 1)) + prevLine.slice(0, offset)
          parts[1] = prevLine.slice(offset) + '\n' + currLinePrefix + parts[1]
        }
        break
      }
      case 'down': {
        const nextNl = parts[1].indexOf('\n')
        if (this.preferredColumn === -1) this.preferredColumn = getLastLinePrefix(parts[0]).length
        if (nextNl === -1) {
          parts[0] = parts[0] + parts[1]
          parts[1] = ''
        } else {
          const currLineRemainder = parts[1].slice(0, nextNl)
          const afterNl = parts[1].slice(nextNl + 1)
          const nextNl2 = afterNl.indexOf('\n')
          const nextLine = nextNl2 === -1 ? afterNl : afterNl.slice(0, nextNl2)
          const rest = nextNl2 === -1 ? '' : afterNl.slice(nextNl2 + 1)
          const offset2 = Math.min(this.preferredColumn, nextLine.length)
          parts[0] = parts[0] + currLineRemainder + '\n' + nextLine.slice(0, offset2)
          parts[1] = nextLine.slice(offset2) + (rest.length > 0 ? '\n' + rest : '')
        }
        break
      }
    }
  }

  vm.onCursorSelect = function () {
    if (this.anchor !== null) {
      this.anchor = null
    } else {
      this.anchor = this.getCursorPosition()
    }
  }

  vm.onCopy = function () {
    const selection = this.getSelectedText()
    if (!global.paste) global.paste = {}
    if (selection) {
      global.paste.text = selection.text
      global.paste.type = 'text'
    } else {
      const parts = this.textParts[this.currentField]
      global.paste.text = parts.join('')
      global.paste.type = 'text'
    }
  }

  vm.onPaste = function () {
    if (!global.paste || !global.paste.text) return
    const parts = this.textParts[this.currentField]
    if (!parts) return
    const selection = this.getSelectedText()
    if (selection) {
      const fullText = parts.join('')
      parts[0] = fullText.slice(0, selection.start) + global.paste.text
      parts[1] = fullText.slice(selection.end)
      this.anchor = null
    } else {
      parts[0] += global.paste.text
    }
  }

  vm.onCut = function () {
    const selection = this.getSelectedText()
    if (!global.paste) global.paste = {}
    if (selection) {
      global.paste.text = selection.text
      global.paste.type = 'text'
      const parts = this.textParts[this.currentField]
      const fullText = parts.join('')
      parts[0] = fullText.slice(0, selection.start)
      parts[1] = fullText.slice(selection.end)
      this.anchor = null
    } else {
      const parts = this.textParts[this.currentField]
      global.paste.text = parts.join('')
      global.paste.type = 'text'
      this.textParts[this.currentField] = ['', '']
    }
  }

  vm.onSelectAll = function () {
    this.anchor = 0
    const parts = this.textParts[this.currentField]
    if (!parts) return
    const fullText = parts.join('')
    parts[0] = fullText
    parts[1] = ''
  }
}
