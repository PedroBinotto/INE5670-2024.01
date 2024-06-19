import {  useEffect, useRef, useState } from 'preact/hooks'
import './app.css'
import axios from 'axios'
import { compareAsc, differenceInMinutes, format, parse, parseISO } from 'date-fns'
import { CartesianGrid, Label, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'

const INTERVAL_SIZE = 7

interface SpanRecord {
  _id: string
  turnedOnAt: string
  turnedOffAt: string
}

interface Span {
  start: Date
  end: Date
}

interface DataPoint {
  records: Span[],
  date: Date,
  weekday: string 
  totalTimeMins: number
}

interface PanelProps {
  data: DataPoint[]
}

function DisplayPanel(props: PanelProps) {
  const { data } = props

  return (
    <LineChart width={1000} height={300} data={data} margin={{ top: 50, right: 20, bottom: 50, left: 0 }}>
      <Line type="monotone" dataKey="totalTimeMins" stroke="#8884d8" />
      <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
      <XAxis dataKey="weekday">
        <Label position={"bottom"} value={"Dia da semana"} />
      </XAxis>
      <YAxis label={{ value: 'Tempo (minutos)', angle: -90, position: 'insideLeft' }} />
      <Tooltip />
    </LineChart>
  )
}

function StatsPanel(props: PanelProps) {
  const { data } = props

  const totalCons = data.reduce((acc, curr) => acc + curr.totalTimeMins, 0)
  const maxCons = data.length ? data.reduce((acc, curr) => acc.totalTimeMins > curr.totalTimeMins ? acc : curr).weekday : '-'
  const minCons = data.length ? data.reduce((acc, curr) => acc.totalTimeMins > curr.totalTimeMins ? curr : acc).weekday : '-'
  const avgCons = Math.round(totalCons / INTERVAL_SIZE)

  return (
    <div style={{fontFamily: 'monospace', textAlign: 'left', whiteSpace: 'pre', fontSize: '20px'}}>
      <span style="font-weight: bold">Relatório de estatísticas:</span>

      <br/> <br/>

      <span style="font-weight: bold">Tempo total de consumo da semana:</span> {totalCons} minutos

      <br/> <br/>

      <span style="font-weight: bold">Dia de maior tempo de consumo:</span> {maxCons} 

      <br/> <br/>

      <span style="font-weight: bold">Dia de menor tempo de consumo:</span> {minCons} 

      <br/> <br/>

      <span style="font-weight: bold">Média de consumo por dia:</span> {avgCons} minutos
    </div>
  )
}

export function App() {
  const [data, setData] = useState<SpanRecord[]>()
  const ref = useRef(null)


  const fetchData = (): void => {
    axios.get<SpanRecord[]>("http://localhost:8000/api").then((response) => {
      setData(response.data)
    })
  }

  useEffect(() => {
    ref.current = setInterval(fetchData, 3000);

    return () => {
      if(ref.current){
        clearInterval(ref.current)
      }
    }
  }, [])
  
  const convertedData = data ? data.map((span) => ({ start: parseISO(span.turnedOnAt), end: parseISO(span.turnedOffAt) })) : []
  const procData = convertedData.reduce((
    acc: Record<string, DataPoint>,
    curr: Span
  ) => {
    const key = format(curr.start, "yyyy-MM-dd")
    const timeSpent = differenceInMinutes(curr.end, curr.start)

    acc[key] = acc[key] !== undefined 
      ? {  ...acc[key], records: [...acc[key].records, curr], totalTimeMins: acc[key].totalTimeMins + timeSpent }
      : { ...acc[key], records: [curr], date: parse(key, "yyyy-MM-dd", new Date()), weekday: format(parse(key, "yyyy-MM-dd", new Date()), 'EEEE'), totalTimeMins: timeSpent }

    return acc
  } , {})
  const plotData = Object.values(procData).sort((a, b) => compareAsc(a.date, b.date)).slice(-INTERVAL_SIZE)

  return (
    <>
      <h2>Análise de consumo de lâmpada ativada por sensor de presença</h2>
      <div class="card">
        <h3> Consumo dos últimos {INTERVAL_SIZE} dias:</h3>
        <div style="display: flex; justify-content: center; align-items: center">
          <DisplayPanel 
            data={plotData}
          />
        </div>
      </div>
      <div class="card">
        <StatsPanel data={plotData} />
      </div>
    </>
  )
}
