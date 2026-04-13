import { Rate } from 'antd';
import type { RateProps } from 'antd';

interface RatingStarsProps extends Omit<RateProps, 'count'> {
  value?: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  allowHalf?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  value = 0,
  onChange,
  readonly = false,
  allowHalf = true,
  style,
  className,
  ...rest
}) => {
  return (
    <Rate
      count={5}
      value={value}
      onChange={onChange}
      disabled={readonly}
      allowHalf={allowHalf}
      className={className}
      style={{ fontSize: 20, ...style }}
      {...rest}
    />
  );
};

export default RatingStars;
