const mj = require("mathjax-node")
const gm = require("gm")
const axios = require("axios")
const FormData = require('form-data')

// slack app verification token (used for initial verification request)
const appVerifToken = process.env.VERIFY_TOKEN
const botToken = process.env.BOT_TOKEN

const texRegex = /\$([^$]+)\$/
const slackUrl = "https://slack.com/api/files.upload"

console.log("cold start")

const successRes = obj => {
  return {
    statusCode: 200,
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(obj),
  }
}

const failureRes = (obj, code) => {
  return {
    statusCode: code || 400,
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(obj),
  }
}

exports.handler = async (event, context) => {
  const {body: bodyStr, httpMethod} = event
  const body = JSON.parse(bodyStr)
  console.log(body)
  
  if (body.type === "url_verification" && httpMethod === "POST") {
    console.log("Received verification request")
    const { token, challenge } = body
    if (token === appVerifToken && challenge) {
      return successRes({ challenge })
    } else {
      return failureRes()
    }
  } else if (body.type === "event_callback" && httpMethod === "POST") {
    console.log("Received event")
    const { text, user, channel } = body.event
    const matched = texRegex.exec(text)
    if (!matched) {
      console.error("tex formula not included")
      return failureRes()
    }
    const tex = matched[1]

    const data = await mj.typeset({
      math: tex,
      format: "TeX", // or "inline-TeX", "MathML"
      svg: true,      // or svg:true, or html:true
    })

    const svg = data.svg
    const svgBuf = Buffer.from(svg, 'utf8')
    gm(svgBuf, 'bla.svg').density(200).toBuffer('PNG', (err, buf) => {
      if (err) {
        console.error("conversion error")
        console.error(err)
        return failureRes()
      }

      const fm = new FormData()
      fm.append("file", buf)
      fm.append("token", botToken)
      fm.append("channels", channel)
      fm.append("filetype", "png")
      axios({
        url: slackUrl,
        method: 'POST',
        headers: {
          "Content-type": "multipart/form-data"
        },
        data: fm
      }).then(response => {
        if (response.data.ok) {
          console.log("upload success")
        } else {
          console.error(response.data)
        }
        return successRes()
      }).catch(err => {
        console.error("upload failed")
        console.error(err)
        return failureRes(null, 500)
      })
    })
  } else {
    return failureRes()
  }
}
