import React, { Component } from "react" // eslint-disable-line no-unused-vars
import "./App.scss"
import AreaChart from "../components/AreaChart"
import { websocketQuery } from "../api/deviceWebSocket"
import { getAlertConfig } from "../api/alertSetting"
import moment from "moment"
import FontAwesome from 'react-fontawesome'

class App extends Component {
  state = {
    currentDeviceData: null,
    initialHistoricalDeviceData: null,
    filteredHistoricalData: null,
    dataToBeDisplayed: null,
    selectedData: null,
    alertConfig: null,
    chartData: null,
    chartPriodType: "days"
  }

  // fomat histrical data 
  formatChartData = (data, type) => {
    const chartTimeFormat = {
      days: "MMM D, hA",
      weeks: "MMM D, YYYY",
      months: "MMM D, YYYY"
    }
    let dataFormat = {}
    this.state.dataToBeDisplayed.forEach((dataKey) => {
      dataFormat[dataKey] = []
      data.forEach((ob) => {
        let dataObject = {}
        dataObject[dataKey] = Math.round(ob[dataKey] * 100) / 100
        dataObject["date"] = moment(ob["_ts"]).format(chartTimeFormat[type])
        dataFormat[dataKey].push(dataObject)
      })
    })
    this.setState({ chartData: dataFormat })
  }

  // chek if current value exceeds alert setting
  checkRange = (dataKey) => {
    const alertSetting = this.state.alertConfig[dataKey]
    const currentValue = this.state.currentDeviceData[dataKey]
    const upperlimit = alertSetting["GT"]
    const lowerlimit = alertSetting["LT"]

    if (currentValue === null || !upperlimit && !lowerlimit) return
    if (!upperlimit && lowerlimit > currentValue) return "warning"
    else if (!upperlimit && lowerlimit < currentValue) return ""
    else if (!lowerlimit && upperlimit < currentValue) return "warning"
    else if (!lowerlimit && upperlimit > currentValue) return ""
    else if (lowerlimit > currentValue || upperlimit < currentValue) {
      return "warning"
    }
    else return ""
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
            this.setState({ initialHistoricalDeviceData: message.data })
            this.setState({
              currentDeviceData: message.data[message.data.length - 1]
            })
            this.setState({ filteredHistoricalData: message.data }, () => {
              if (!this.state.chartData) {
                this.formatChartData(this.state.filteredHistoricalData, this.state.chartPriodType)
              }
            })
          }
          if (message.event === "update_data") {
            const { initialHistoricalDeviceData } = this.state
            const newValue = message.data.new_val
            const newHistoricalData = [...initialHistoricalDeviceData, newValue]
            this.setState({ initialHistoricalDeviceData: newHistoricalData })
            this.setState({ filteredHistoricalData: newHistoricalData }, () => {
              this.formatChartData(this.state.filteredHistoricalData, this.state.chartPriodType)
            })
            this.setState({ currentDeviceData: newValue })
          }
          break
      }
    })
  }

  componentDidMount() {
    this.connectConctrWebSocket(1, this.state.chartPriodType)

    getAlertConfig().then((alertConfigData) => {
      this.setState({
        alertConfig: alertConfigData,
        dataToBeDisplayed: alertConfigData.selectedKey
      })
    })
  }

  handleDataClick = selectedData => {
    this.setState({ selectedData })
  }

  render() {
    const {
      currentDeviceData,
      initialHistoricalDeviceData,
      filteredHistoricalData,
      dataToBeDisplayed,
      selectedData
    } = this.state
    return (
      <div className="plugin-container wrap center-text">

        <select onChange={(e) => {
          this.setState({ chartPriodType: e.target.value, chartData: null }, () => {
            this.connectConctrWebSocket(1, this.state.chartPriodType)
          })
        }}>
          <option value="days">1 day</option>
          <option value="weeks">1 week</option>
          <option value="months">1 Month</option>
        </select>
        {dataToBeDisplayed &&
          currentDeviceData ?
          dataToBeDisplayed.map(data => {
            return (
              <div
                onClick={this.handleDataClick.bind(this, data)}
                key={data}
                className={`plugin-flex ${data === selectedData &&
                  "plugin-flex-selected"} ${this.checkRange(data)}`}
              >
                {data}: {currentDeviceData && currentDeviceData[data]}
                <div className="historical-charts-data">
                  {this.state.chartData ? <AreaChart
                    data={this.state.chartData}
                    dataKey={data}
                  /> :
                    <FontAwesome
                      name='refresh'
                      size='2x'
                      spin
                    />}
                </div>
              </div>
            )
          }) :
          <FontAwesome
            name='refresh'
            size='2x'
            spin
          />
        }
        {selectedData && (
          <div className="selected-chart-data">
            {this.state.chartData ? <AreaChart
              data={this.state.chartData}
              dataKey={selectedData}
            /> : <FontAwesome
                name='refresh'
                size='2x'
                spin
              />}
          </div>
        )}
      </div>
    )
  }
}

export default App
