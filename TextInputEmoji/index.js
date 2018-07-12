import React, { Component } from 'react'
import { TextInput, Text, View } from 'react-native'
import style from './style'
import { MAX_EMOJI_SIZE, ASYNC_TIMER, EMOJI_UNICODE_START } from './constants'

export default class TextInputCustom extends Component {
    constructor(props) {
        super(props)
        this.state = {
            count: this.props.maxLength, //shows the count in text input
            maxLength: MAX_EMOJI_SIZE, //Maximum length of TextInput character is
            text: "",   //Current text which we process i.e., slicing ,
        }
        this.maxTextLength = this.props.maxLength
        this.currentLength = 0
    }

    checkIfEmoji(difference, currentText, currentTextDeletion, diff) {
        let isEmoji = false, entered = 0
        if (difference > 0 && currentText.charCodeAt(0) > EMOJI_UNICODE_START) { //if  text insert and is emoji
            this.currentLength += 1;
            isEmoji = true
            entered += 1
        } else if (difference < 0 && currentTextDeletion.charCodeAt(0) > EMOJI_UNICODE_START) { //if text removed and is emoji
            this.currentLength -= 1;
            isEmoji = true
            entered -= 1
        }
        //If word replaced by Emoji
        if (currentTextDeletion.length > 0) {
            if (currentText.charCodeAt(0) > EMOJI_UNICODE_START && this.ifWordRepacedByEmoji > 0 && currentTextDeletion.charCodeAt(0) < EMOJI_UNICODE_START) {
                this.currentLength += (diff * -1)  //change diff sign and add 3 as it is emoji and space after emoji
                this.currentLength -= this.ifWordRepacedByEmoji - 3 + entered
                isEmoji = true
            }
        }
        return isEmoji
    }

    /**
     * This function return the index position where new text is changed compare to old text
     * @param {string} newText updated Text
     * @param {string} oldText Old Text
     */
    getChangePoint(newText, oldText) {
        let change = -1
        this.firstPoint = -1
        for (let i = 0; i < Math.max(newText.length, oldText.length); i++) {
            if (newText.charAt(i) !== oldText.charAt(i) && newText.charAt(i).toLocaleLowerCase() === oldText.charAt(i).toLocaleLowerCase() && this.firstPoint === -1) {
                this.firstPoint = i
            }
            if (newText.charAt(i) !== oldText.charAt(i)) {
                change = i
                break
            }
        }
        return change === -1 ? newText.length : change
    }

    checkIfSameEmojiEnterAgain(newText, oldText, difference, startPoint) {
        let sameEmoji = false
        let newTextLeft = newText.slice(startPoint - difference, startPoint)
        let newTextRight = newText.slice(startPoint, startPoint + difference)
        let oldTextLeft = oldText.slice(startPoint + difference, startPoint)
        let oldTextRight = oldText.slice(startPoint, startPoint - difference)

        if (difference > 0) {
            if (newTextLeft === newTextRight) {
                sameEmoji = true
            }
        } else if (difference < 0) {
            if (oldTextLeft === oldTextRight) {
                sameEmoji = true
            }
        }
        return sameEmoji
    }

    getChangeFromLast(newText, oldText, difference, startPoint) {

        let change = 0, newMax = newText.length >= oldText.length ? true : false, lengthOfChangeText = difference

        if (this.checkIfSameEmojiEnterAgain(newText, oldText, difference, startPoint)) {
            if (difference > 0) {
                change = startPoint + difference
            } else if (difference < 0) {
                change = startPoint - difference
            }
        } else {
            let absDifference = Math.abs(difference)
            for (let i = Math.max(newText.length, oldText.length); i >= 0; i--) {
                if (newText.charAt(newMax ? i : i - absDifference).toLocaleLowerCase() !== oldText.charAt(!newMax ? i : i - absDifference).toLocaleLowerCase()) {
                    change = i + 1
                    break
                }
            }
        }
        return { large: change }
    }

    //return 0 if word is not replaced by emoji else return old string length
    wordReplacedByEmoji(newText, oldText, difference, startPoint, lastPoint) {
        let d = oldText.slice(startPoint, lastPoint).split(' ')[0]
        console.log("d: " + d + " len: " + d.length + " start: " + startPoint + " end: " + lastPoint + " lenOld: " + oldText.length + " lenNew:  " + newText.length)
        return d.length
    }

    /**
     * return new string after processing
     * @param {string} text 
     */
    getTextBeforeUpdate({ nativeEvent: { text } }) {
        let textToBeUpdateAfterProcessing = text, maxLength = 0
        if (this.props.showCount) {
            if (text === '') {//if whole text is clear by user reset it to default state
                this.currentLength = 0
                maxLength = MAX_EMOJI_SIZE
            } else {
                let difference = text.length - this.state.text.length//numeric defference between old and new text
                let diff = difference !== 0 ? difference / Math.abs(difference) : 0 //it give integer value either 1 or -1 as per insertion(1) or deletion(-1) 
                this.currentLength += diff
                // console.log(diff + "  diff")
                if (this.currentLength > this.maxTextLength * 100) { //If number of character counter get more than this.maxTextLength
                    this.currentLength = this.emojiEnterOnLastSpace === true ? this.currentLength : this.maxTextLength
                    maxLength = this.state.text.length
                    textToBeUpdateAfterProcessing = this.state.text
                } else { //Insertion or Deletion if number of char count is less than MAX_TEXT_SIZE
                    let startPoint = this.getChangePoint(text, this.state.text, difference)
                    let changeFromEnd = this.getChangeFromLast(text, this.state.text, difference, startPoint)
                    let getLastPointOfTextDeletion = changeFromEnd.large
                    this.ifWordRepacedByEmoji = this.wordReplacedByEmoji(text, this.state.text, difference, startPoint, getLastPointOfTextDeletion)
                    let currentTextDeletion = this.state.text.slice(startPoint, this.ifWordRepacedByEmoji > 0 ? getLastPointOfTextDeletion + 1 : startPoint - 1)//slice text if user delete text, returns old part of text
                    let currentText = text.slice(startPoint, startPoint + getLastPointOfTextDeletion)//slice text if user insert text, returns new part of text
                    let isEmoji = this.checkIfEmoji(difference, currentText, currentTextDeletion, diff)
                    // console.log(currentText + " : " + currentTextDeletion + " start:  " + startPoint + "  end:  " + getLastPointOfTextDeletion + "  diff:  " + difference)
                    if (isEmoji === true) { //Emoji inserted or Removed
                        if (this.currentLength > this.maxTextLength && diff > 0) {// if emoji entered on last space i.e., 10th character
                            this.emojiEnterOnLastSpace = true
                        } else {
                            this.emojiEnterOnLastSpace = false
                        }
                        maxLength = this.currentLength >= this.maxTextLength ? text.length : text.length + MAX_EMOJI_SIZE
                        textToBeUpdateAfterProcessing = text.slice(0, text.length)

                    } else if (this.currentLength > this.maxTextLength) {
                        this.currentLength = this.emojiEnterOnLastSpace === true ? this.currentLength : this.maxTextLength
                        maxLength = this.state.text.length
                        textToBeUpdateAfterProcessing = this.state.text
                    } else {
                        this.emojiEnterOnLastSpace = false
                        //Text inserted or removed
                        let updateText = text
                        if (diff == 1 && difference > 1)//text inserted from autosuggestion or voice input i.e., more than one chrater text input
                        {
                            this.currentLength -= 1//reset current length to old position
                            let freeSpace = this.maxTextLength - this.currentLength + currentTextDeletion.length //subtrct replaced length
                            this.currentLength = this.currentLength + (currentText.length >= freeSpace ? freeSpace : currentText.length) - currentTextDeletion.length//increment curent length with new word size

                            let newInsertedText = currentText.slice(0, Math.min(freeSpace, currentText.length))

                            updateText = this.state.text.slice(0, startPoint) + newInsertedText + this.state.text.slice(startPoint + currentTextDeletion.length, this.state.text.length)
                            if (this.firstPoint !== -1) {
                                //first letter capital
                                let processText = ''
                                for (let i = 0; i < updateText.length; i++) {
                                    if (i == this.firstPoint) {
                                        processText += updateText.charAt(i).toUpperCase()
                                    } else {
                                        processText += updateText.charAt(i)
                                    }
                                }
                                updateText = processText
                            }
                        } else if (difference < -1) {//text removed or more than one text removed at a time
                            this.currentLength -= currentTextDeletion.length - 2
                        }

                        maxLength = this.currentLength == this.maxTextLength ? updateText.length : Math.max(text.length + MAX_EMOJI_SIZE, MAX_EMOJI_SIZE)
                        textToBeUpdateAfterProcessing = updateText
                    }
                }
            }
        }
        this.setState({ text: textToBeUpdateAfterProcessing, count: this.maxTextLength - this.currentLength, maxLength }, () => {
            setTimeout(() => {
                this.props.onChangeText(textToBeUpdateAfterProcessing, this.currentLength > this.maxTextLength ? true : false)
            }, ASYNC_TIMER)
        })
    }

    render() {
        return (
            <View
                style={[style.underline, this.props.style ? this.props.style : {}]}
            >
                <TextInput
                    onChange={this.getTextBeforeUpdate.bind(this)}
                    value={this.props.value}
                    {...this.props.email ? { keyboardType: "email-address" } : null}
                    ref={r => this.textInput = r}
                    autoCapitalize={"none"}
                    placeholder="   "
                    {...this.props.showCount !== undefined ? { maxLength: this.state.maxLength } : null}
                    secureTextEntry={this.props.password ? true : false}
                    underlineColorAndroid={'rgba(0,0,0,0)'}
                    style={[style.inputText, this.props.textStyle ? this.props.textStyle : {}, this.props.centerText ? { textAlign: 'center' } : {}, { color: this.currentLength > this.maxTextLength ? 'red' : 'black' }]}
                />
                {
                    this.currentLength > this.maxTextLength ?
                        <View style={style.validation}>
                            <Text style={style.validationText}>{ValidateMessage}</Text>
                        </View> : null
                }
                {
                    this.props.showCount ?
                        <Text
                            style={[style.textCount, { color: this.currentLength > this.maxTextLength ? 'red' : 'black' }]}
                        >
                            {this.state.count}
                        </Text>
                        : null
                }
            </View>
        )
    }
}
