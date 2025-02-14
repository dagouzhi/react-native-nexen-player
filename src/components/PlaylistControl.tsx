import React from 'react';
import {
  FlatList,
  Image,
  ListRenderItemInfo,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import GradientView from './GradientView';
import ModalView from './ModalView';
import { NexenTheme } from '../utils/Theme';
import { EdgeInsets, PlayListItem } from './NexenPlayer';
import { IconPlayCircle } from '../assets/icons';
import { withAnimation } from '../hoc/withAnimation';

type PlaylistControlProps = {
  fullScreen?: boolean;
  playlist?: PlayListItem[];
  playlistIndex?: number;
  nexenTheme?: NexenTheme;
  insets?: EdgeInsets;
  style?: StyleProp<ViewStyle>;
  onPlayListItemPress?: (index: number) => void;
};

const PlaylistControl = (props: PlaylistControlProps) => {
  const {
    style,
    playlist,
    playlistIndex,
    fullScreen,
    insets,
    onPlayListItemPress,
  } = props;

  const playlistRef = React.useRef<FlatList>(null);

  const CONTAINER_HEIGHT = StyleSheet.flatten(style).height || 120;
  const CONTAINER_PADDING = 16;
  const ITEM_HEIGHT = (fullScreen
    ? Number(CONTAINER_HEIGHT) - CONTAINER_PADDING - insets?.bottom!
    : Number(CONTAINER_HEIGHT) - CONTAINER_PADDING * 2 || 100);
  const ITEM_WIDTH = ITEM_HEIGHT * (16 / 9);
  const ICON_SIZE = ITEM_HEIGHT * 0.6;

  const SEPERATOR_WIDTH = 5;
  const TOTAL_WIDTH = ITEM_WIDTH + SEPERATOR_WIDTH;

  const CONTAINER_HORIZONTAL_PADDING = fullScreen
    ? (insets?.left! + insets?.right!) / 2 > 0
      ? (insets?.left! + insets?.right!) / 2
      : 8
    : 8;

  const renderPlayListItem = ({
    item,
    index,
  }: ListRenderItemInfo<PlayListItem>) => {
    const itemStyle = {
      width: !Number.isNaN(ITEM_WIDTH) ? ITEM_WIDTH : 100,
      height: !Number.isNaN(ITEM_HEIGHT) ? ITEM_HEIGHT : 100,
    };

    return (
      <TouchableOpacity
        style={[styles.itemContainer, itemStyle, index === playlistIndex ? styles.itemOn : undefined]}
        activeOpacity={0.6}
        onPress={() => {
          onPlayListItemPress?.(index);
        }}
      >
        <Image
          style={[styles.image, itemStyle]}
          source={{ uri: item.itemSource.poster || 'https://console.dagouzhi.com/config/assets/rooms_icon.png' }}
        />
        <Text style={[styles.title]}>{item.itemSource?.title}</Text>
        {index !== playlistIndex && (
          <IconPlayCircle
            style={styles.icon}
            size={(ICON_SIZE || 50)}
            color={'#fafafa'}
          />
        )}
      </TouchableOpacity>
    );
  };

  const containerStyle = {
    left: CONTAINER_HORIZONTAL_PADDING,
    right: CONTAINER_HORIZONTAL_PADDING,
    bottom: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
  };

  return (
    <ModalView style={[styles.container, style, containerStyle]}>
      <GradientView
        style={{
          height: '100%',
          width: '100%',
        }}
        startOpacity={0.0}
        middleOpacity={0.2}
        endOpacity={0.5}
      />
      <View style={[styles.innerContainer]}>
        <FlatList
          ref={playlistRef}
          style={styles.list}
          keyExtractor={(_, index) => JSON.stringify(_?.itemSource?.source || index)}
          ItemSeparatorComponent={() => (
            <View style={{ width: SEPERATOR_WIDTH }} />
          )}
          data={playlist}
          renderItem={renderPlayListItem}
          initialScrollIndex={playlistIndex}
          getItemLayout={(_, index) => ({
            length: (TOTAL_WIDTH || 100),
            offset: (TOTAL_WIDTH || 100) * index,
            index,
          })}
          horizontal
          bounces={false}
        />
      </View>
    </ModalView>
  );
};

export default withAnimation(PlaylistControl);

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    zIndex: 110,
  },
  innerContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  list: {
    flex: 1,
  },
  itemContainer: {
    backgroundColor: '#212121',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: .5,
  },
  itemOn: {
    borderWidth: 3,
    borderColor: 'red',
    opacity: 1,
  },
  image: {
    resizeMode: 'cover',
  },
  title: {
    backgroundColor: '#fff',
    position: 'absolute',
    top: 0,
    left: 0,
    padding: 5,
    fontSize: 12,
  },
  icon: {
    position: 'absolute',
  },
});
