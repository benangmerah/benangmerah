import ChartContainer from './ChartContainer';
import { VictoryChart, VictoryLine, VictoryVoronoiTooltip } from 'victory';

export default props =>
  <ChartContainer>
    <VictoryChart>
      <VictoryLine
        labelComponent={<VictoryVoronoiTooltip />}
        data={props.data}
        style={{ data: { stroke: 'red' } }}
      />
    </VictoryChart>
  </ChartContainer>