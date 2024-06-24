import {  useEffect, useRef, useState } from 'preact/hooks'
import './app.css'
import axios from 'axios'
import { compareAsc, differenceInSeconds, format, parse, parseISO } from 'date-fns'
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
  totalTimeSecs: number
}

interface PanelProps {
  data: DataPoint[]
}

function DisplayPanel(props: PanelProps) {
  const { data } = props

  return (
    <div className="w-full max-w-5xl">
      <LineChart 
        width={window.innerWidth > 768 ? 1000 : window.innerWidth - 40}
        height={300} 
        data={data} 
        margin={{ top: 50, right: 20, bottom: 50, left: 0 }}
      >
        <Line type="monotone" dataKey="totalTimeSecs" stroke="#8884d8" />
        <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
        <XAxis dataKey="weekday">
          <Label position={"bottom"} value={"Dia da semana"} />
        </XAxis>
        <YAxis label={{ value: 'Tempo (minutos)', angle: -90, position: 'insideLeft' }} />
        <Tooltip />
      </LineChart>
    </div>
  )
}

function StatsPanel(props: PanelProps) {
  const { data } = props

  const totalCons = data.reduce((acc, curr) => acc + curr.totalTimeSecs, 0)
  const maxCons = data.length ? data.reduce((acc, curr) => acc.totalTimeSecs > curr.totalTimeSecs ? acc : curr).weekday : '-'
  const minCons = data.length ? data.reduce((acc, curr) => acc.totalTimeSecs > curr.totalTimeSecs ? curr : acc).weekday : '-'
  const avgCons = Math.round(totalCons / data.length)

  return (
    <div className="font-mono text-left whitespace-pre p-4 text-lg sm:text-xl md:text-2xl lg:text-3xl">
      <span className="font-bold block mb-4">Relatório de estatísticas:</span>

      <br/> <br/>

      <span className="font-bold block mb-4">Tempo total de consumo da semana:</span> {totalCons} segundos 

      <br/> <br/>

      <span className="font-bold block mb-4">Dia de maior tempo de consumo:</span> {maxCons} 

      <br/> <br/>

      <span className="font-bold block mb-4">Dia de menor tempo de consumo:</span> {minCons} 

      <br/> <br/>

      <span className="font-bold block mb-4">Média de consumo por dia:</span> {avgCons} segundos
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
    const timeSpent = differenceInSeconds(curr.end, curr.start)

    acc[key] = acc[key] !== undefined 
      ? {  ...acc[key], records: [...acc[key].records, curr], totalTimeSecs: acc[key].totalTimeSecs + timeSpent }
      : { ...acc[key], records: [curr], date: parse(key, "yyyy-MM-dd", new Date()), weekday: format(parse(key, "yyyy-MM-dd", new Date()), 'EEEE'), totalTimeSecs: timeSpent }

    return acc
  } , {})
  const plotData = Object.values(procData).sort((a, b) => compareAsc(a.date, b.date)).slice(- INTERVAL_SIZE)

  return (
    <>
      <h2 className="text-center text-xl md:text-2xl lg:text-3xl font-bold mb-4">Análise de consumo de lâmpada ativada por sensor de presença</h2>
      <div className="card p-4 mb-6">
        <h3 className="text-lg md:text-xl lg:text-2xl mb-4"> Consumo dos últimos {plotData.length} dias:</h3>
        <div className="flex justify-center items-center">
          <DisplayPanel 
            data={plotData}
          />
        </div>
      </div>
      <div className="card p-4">
        <StatsPanel data={plotData} />
      </div>
    </>
  )
}
