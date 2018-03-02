import React, { Component } from "react" // eslint-disable-line no-unused-vars
import "./App.scss"
import { websocketQuery } from "../api/deviceWebSocket"
import { getAlertConfig } from "../api/alertSetting"
import moment from "moment"
import FontAwesome from "react-fontawesome"

import { Line } from "react-chartjs-2"

class App extends Component {
  state = {
    currentDeviceData: null,
    initialHistoricalDeviceData: null,
    filteredHistoricalData: null,
    dataToBeDisplayed: [],
    selectedData: null,
    alertConfig: null,
    chartData: null,
    chartPeriodType: "days",
    errorType: null
  }

  // check rssi level 
  checkRssiLevel = value => {
    if (value >= -50) {
      // ~ -50dBm
      return "fourth"
    }
    else if (value >= -70) {
      // -50dBm ~ -70dBm
      return "third"
    }
    else if (value >= -80) {
      // -70dBm ~ -80dBm
      return "second"
    }
    else {
      // -80dBm ~
      return "first"
    }
  }

  // get percentage of battery
  getPercentage = (value, max) => {
    return value / max * 100
  }

  // check battery level 
  checkBatteryLevel = value => {
    if (value >= 60) {
      // above 75 %   return green color
      return "green"
    }
    else if (value >= 30) {
      // above 30 %
      return "orange"
    }
    else {
      // under 30 %
      return "red"
    }

  }


  //  round decimal point 2
  roundDecimalTwo = data => {
    return Math.round(data * 100) / 100
  }

  // toggle selected button color
  toggleButtonColor = type => {
    return this.state.chartPeriodType === type ? "selected" : ""
  }

  // button onclick func
  buttonOnClick = e => {
    this.setState({ chartPeriodType: e.target.value, chartData: null }, () => {
      this.connectConctrWebSocket(1, this.state.chartPeriodType)
    })
  }

  // find the latest valid data
  getLatestValidData = dataArr => {
    let count = 1
    let validData = dataArr[dataArr.length - count]
    while (!dataArr[dataArr.length - count][this.state.dataToBeDisplayed[0]]) {
      count++
      validData = dataArr[dataArr.length - count]
    }
    return validData
  }

  // fomat histrical data (for react chart.js2)
  formatChartData = (data, type) => {
    const chartTimeFormat = {
      days: "MMM D, hA",
      weeks: "MMM D, YYYY",
      months: "MMM D, YYYY"
    }

    //  adjust how much data you need for each type.(3 means taking every 3 data from historical data)
    const chartDataAmount = {
      days: 1,
      weeks: 3,
      months: 15
    }

    let dataFormat = {}
    this.state.dataToBeDisplayed.forEach(dataKey => {
      dataFormat[dataKey] = []
      dataFormat["date"] = []
      data.forEach((ob, index) => {
        if (index % chartDataAmount[type] === 0) {
          dataFormat[dataKey].push(this.roundDecimalTwo(ob[dataKey]))
          dataFormat["date"].push(
            moment(ob["_ts"]).format(chartTimeFormat[type])
          )
        }
      })
    })
    this.setState({ chartData: dataFormat })
  }

  // retrun data for the corresponding key
  getChartData = datakey => {
    const data = {
      labels: this.state.chartData["date"],
      datasets: [
        {
          label: datakey,
          // trigger of area chart
          fill: false,
          lineTension: 0.1,
          backgroundColor: "rgba(75,192,192,0.4)",
          //  chart line color
          borderColor: "rgba(75,192,192,1)",
          borderCapStyle: "butt",
          //  color of area chart filling
          backgroundColor: "rgba(75,192,192,0.6)",
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgba(75,192,192,1)",
          pointBackgroundColor: "#fff",
          pointBorderWidth: 1,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgba(75,192,192,1)",
          pointHoverBorderColor: "rgba(220,220,220,1)",
          pointHoverBorderWidth: 2,
          pointRadius: 1,
          pointHitRadius: 10,
          data: this.state.chartData[datakey]
        }
      ]
    }
    return data
  }

  // chek if current value exceeds alert setting
  checkRange = dataKey => {
    const alertSetting = this.state.alertConfig[dataKey]
    const currentValue = this.state.currentDeviceData[dataKey]
    const upperlimit = alertSetting["GT"]
    const lowerlimit = alertSetting["LT"]

    if (currentValue === null || (!upperlimit && !lowerlimit)) return
    if (!upperlimit && lowerlimit > currentValue) return "warning"
    else if (!upperlimit && lowerlimit < currentValue) return ""
    else if (!lowerlimit && upperlimit < currentValue) return "warning"
    else if (!lowerlimit && upperlimit > currentValue) return ""
    else if (lowerlimit > currentValue || upperlimit < currentValue) {
      return "warning"
    } else return ""
  }

  // diconnect from current websocket function
  disconnectCurrentWebsocket = () => {
    const { client } = this.state
    if (client && client.state === "connected") {
      client.disconnect()
    }
  }

  // Connect to conctr websocket
  connectConctrWebSocket = (time, timeFormat) => {
    // disconnect from current websocket if it exists
    this.disconnectCurrentWebsocket()
    const client = new window.ActionheroClient({
      url: "https://api.staging.conctr.com"
    })
    this.setState({ client })

    client.connect((err, detail) => {
      // use the imported query to query the websocket
      const deviceSearchQuery = websocketQuery(1, timeFormat)
      client.action("device_search_historical", deviceSearchQuery)
    })

    client.on("message", message => {
      switch (message.context) {
        case "historical_data":
          if (message.event === "initial_data") {
            const filteredNullData = message.data.filter(
              data => data[this.state.dataToBeDisplayed[0]]
            )
            this.setState({ initialHistoricalDeviceData: filteredNullData })
            this.setState({
              currentDeviceData: this.getLatestValidData(filteredNullData)
            })

            this.setState({ filteredHistoricalData: filteredNullData }, () => {
              if (!this.state.chartData) {
                this.formatChartData(
                  this.state.filteredHistoricalData,
                  this.state.chartPeriodType
                )
              }
            })
          }
          if (
            message.event === "update_data" &&
            message.data.new_val[this.state.dataToBeDisplayed[0]]
          ) {
            const { initialHistoricalDeviceData } = this.state
            const newValue = message.data.new_val
            const newHistoricalData = [...initialHistoricalDeviceData, newValue]
            this.setState({ initialHistoricalDeviceData: newHistoricalData })
            this.setState({ filteredHistoricalData: newHistoricalData }, () => {
              this.formatChartData(
                this.state.filteredHistoricalData,
                this.state.chartPeriodType
              )
            })
            this.setState({ currentDeviceData: newValue })
          }
          break
      }
    })
  }

  componentDidMount() {
    this.connectConctrWebSocket(1, this.state.chartPeriodType)

    getAlertConfig()
      .then(alertConfigData => {
        this.setState(
          {
            alertConfig: alertConfigData,
            dataToBeDisplayed: alertConfigData.selectedKey
          },
          () => {
            if (this.state.dataToBeDisplayed.length === 0) {
              this.setState({ errorType: "dataKeys" })
            }
          }
        )
      })
      .catch(error => {
        this.setState({ errorType: "keys" })
      })
  }

  handleDataClick = selectedData => {
    this.setState({ selectedData })
  }

  render() {
    // option for customizing chart's color
    const chartOption = {
      // legend: {
      //   display: true,
      //   position: 'top',
      //   labels: {
      //     // top legend color
      //     fontColor: 'black'
      //   }
      // },
      // scales: {
      //   xAxes: [{
      //     ticks: {
      //       // x axis font color
      //       fontColor: '#000'
      //     },
      //     gridLines: {
      //       // display: false,
      //       //  x axis grid line color
      //       color: "#f3f3f3"
      //     }
      //   }],
      //   yAxes: [{
      //     ticks: {
      //       // y axis font color
      //       fontColor: '#000'
      //     },
      //     gridLines: {
      //       // display: false,
      //       //  y axis grid line color
      //       color: "f3f3f3"
      //     }
      //   }]
      // }
    }

    const {
      currentDeviceData,
      initialHistoricalDeviceData,
      filteredHistoricalData,
      dataToBeDisplayed,
      selectedData,
      errorType,
      chartPeriodType
    } = this.state

    const batteryPercentage = currentDeviceData ? Math.round(this.getPercentage(currentDeviceData.battery, 3)) : null

    return !errorType ? (
      <div className="plugin-container wrap center-text" style={{ backgroundColor: window.cm_device_info.bg_color }}>
        {currentDeviceData &&
          <div id='indicator'>
            <div className={`wifi_group ${this.checkRssiLevel(currentDeviceData.rssi)}`} >
              <div className="wifi_top"></div>
              <div className="wifi_bottom"></div>
            </div>
            <p id="battery-percent">{batteryPercentage}%</p>
            <div className="icon-battery">
              <div className="battery-filling" style={{
                width: `${batteryPercentage}%`,
                backgroundColor: `${this.checkBatteryLevel(batteryPercentage)}`
              }}></div>
            </div>
          </div>
        }

        <div className="button-group" style={{ backgroundColor: window.cm_device_info.button_group_bg }}>
          <button
            style={{
              backgroundColor: window.cm_device_info.button_normal_bg,
              color: window.cm_device_info.button_normal_color
            }}
            className={`type-buttons ${this.toggleButtonColor("days")}`}
            value="days"
            onClick={e => {
              this.buttonOnClick(e)
            }}
          >
            1 day
          </button>
          <button
            style={{
              backgroundColor: window.cm_device_info.button_normal_bg,
              color: window.cm_device_info.button_normal_color
            }}
            className={`type-buttons ${this.toggleButtonColor("weeks")}`}
            value="weeks"
            onClick={e => {
              this.buttonOnClick(e)
            }}
          >
            1 week
          </button>
          <button
            style={{
              backgroundColor: window.cm_device_info.button_normal_bg,
              color: window.cm_device_info.button_normal_color
            }}
            className={`type-buttons ${this.toggleButtonColor("months")}`}
            value="months"
            onClick={e => {
              this.buttonOnClick(e)
            }}
          >
            1 month
          </button>
        </div>

        {dataToBeDisplayed && currentDeviceData ? (
          dataToBeDisplayed.map(data => {
            return (
              <div
                onClick={this.handleDataClick.bind(this, data)}
                key={data}
                className={`plugin-flex ${data === selectedData &&
                  'plugin-flex-selected'} ${this.checkRange(data)}`}
                style={{ backgroundColor: window.cm_device_info.plugin_flex_color }}
              >
                <div style={{ color: window.cm_device_info.plugin_flex_text_color }}>{data}:{' '}
                  {currentDeviceData &&
                    this.roundDecimalTwo(currentDeviceData[data])}</div>
                <div className="historical-charts-data">
                  {this.state.chartData ? (
                    <Line data={this.getChartData(data)} options={chartOption} />
                  ) : (
                      <FontAwesome name="refresh" size="2x" spin />
                    )}
                </div>
              </div>
            )
          })
        ) : (
            <div className={`plugin-flex`}>
              <FontAwesome name="refresh" size="2x" spin />
            </div>
          )}
        {selectedData && (
          <div className="selected-chart-data">
            {this.state.chartData ? (
              <Line data={this.getChartData(selectedData)} />
            ) : (
                <FontAwesome name="refresh" size="2x" spin />
              )}
          </div>
        )}
      </div>
    ) : errorType === "keys" ? (
      <div className="errorMess">Please check your device keys</div>
    ) : (
          <div className="errorMess">
            You have not choosen any data keys to display
      </div>
        )
  }
}

export default App
