import React from 'react';
import { ColorValue } from 'react-native';
import { Path, Polygon, Svg, SvgProps } from 'react-native-svg';

const Airplay = (props: Props) => {
  const { color, size, ...rest } = props;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <Path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1" />
      <Polygon points="12 15 17 21 7 21 12 15" />
    </Svg>
  );
};

export default Airplay;

interface Props extends SvgProps {
  color?: ColorValue;
  size?: string | number;
}

Airplay.defaultProps = {
  color: 'black',
  size: '24',
};
