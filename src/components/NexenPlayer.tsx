import React from 'react';
import {
  Animated,
  AppState,
  BackHandler,
  I18nManager,
  LayoutChangeEvent,
  NativeModules,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import {
  IconLock,
  IconPaly,
  IconPause,
  IconRepeat,
  IconUnlock,
  IconZap,
} from '../assets/icons';
import { getAspectRatioTipText, getTimeTipText } from '../utils/StringUtil';
import FooterControl, { FooterControlRef } from './FooterControl';
import GestureView, {
  GestureEventType,
  MAX_BRIGHTNESS,
  MAX_VOLUME,
  TapEventType,
} from './GestureView';
import TipView, { TipViewRef, TipViewTheme } from './TipView';
import MoreControl, { MoreItem } from './MoreControl';
import {
  NexenTheme,
  DefaultTheme,
  DefaultSizesTheme,
  DefaultMiniSeekBarTheme,
} from '../utils/Theme';
import HeaderControl, { HeaderControlRef } from './HeaderControl';
import LineSeekBar, { LineSeekBarTheme } from './LineSeekBar';
import SpeedControl from './SpeedControl';
import TrackControl from './TrackControl';
import PlayButton from './PlayButton';
import Loader from './Loader';
import { getAlphaColor } from '../utils/ColorUtil';
import Video, {
  LoadError,
  OnLoadData,
  OnProgressData,
  OnSeekData,
  TextTrackType,
} from 'react-native-video';
import { getBrightnessIcon, getVolumeIcon } from '../utils/ComponentUtil';
import PlaylistControl from './PlaylistControl';
import { WrapperComponentRef } from '../hoc/withAnimation';
import PosterView from './PosterView';

const { NexenPlayerModule } = NativeModules;

const ANIMATION_DURATION = 300;
const USE_NATIVE_DRIVER = false;
const FORWARD_OR_REWIND_DURATION = 10;

export type EdgeInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};
export type LayoutMode = 'basic' | 'intermediate' | 'advanced';
export type ControlHideMode = 'auto' | 'touch';
export type Dimension = { width: number; height: number };
export type ResizeMode = 'stretch' | 'contain' | 'cover' | undefined;
export type TextTrackType =
  | 'application/x-subrip'
  | 'application/ttml+xml'
  | 'text/vtt';
export type TextTrack = {
  index: number;
  title?: string | undefined;
  language?: string | undefined;
  type: TextTrackType;
  uri: string;
};
export type SelectedTextTrack = {
  type: 'system' | 'disabled' | 'title' | 'language' | 'index';
  value?: string | number | undefined;
};
export type AudioTrack = {
  index: number;
  title: string;
  language: string;
  type: string;
};
export type SelectedAudioTrack = {
  type: 'system' | 'disabled' | 'title' | 'language' | 'index';
  value?: string | number | undefined;
};
export type PlaybackSpeed =
  | '0.25'
  | '0.5'
  | '0.75'
  | '1.0'
  | '1.5'
  | '2.0'
  | '3.0';
export type Source =
  | {
      uri?: string | undefined;
      headers?: { [key: string]: string } | undefined;
      type?: string | undefined;
    }
  | number;

export type PlayList = {
  items?: PlayListItem[];
  currentIndex?: number;
};
export interface PlayListItem {
  itemSource: NexenSource;
}

const RESIZE_MODES = ['BEST_FIT', 'FIT_TO_SCREEN', 'FILL_TO_SCREEN'];
const RESIZE_MODE_VALUES: ResizeMode[] = ['contain', 'cover', 'stretch'];

export type NexenPlayerRef = {
  play: () => void;
  pause: () => void;
  stop: () => void;
  skipNext: () => void;
  skipBack: () => void;
  setFullScreenMode: (fullScreen: boolean) => void;
};

export type NexenSource = {
  source: Source;
  title?: string;
  poster?: string | undefined;
  textTracks?: TextTrack[];
  selectedTextTrack?: SelectedTextTrack;
  selectedAudioTrack?: SelectedAudioTrack;
};

export type NexenConfig = {
  loaderText?: string;
  errorText?: string;
  doubleTapTime?: number;
  controlTimeout?: number;
  controlHideMode?: ControlHideMode;
  layoutMode?: LayoutMode;
  posterResizeMode?: ResizeMode;
  resizeMode?: ResizeMode;
  volume?: number;
  brightness?: number;
  playbackSpeed?: PlaybackSpeed;
  muted?: boolean;
  repeat?: boolean;
  autoPlay?: boolean;

  index?: number;
  activeIndex?: number;
  optimize?: boolean;

  disableOnScreenPlayButton?: boolean;
  disableBack?: boolean;
  disableResizeMode?: boolean;
  disableVolume?: boolean;
  disableMore?: boolean;
  disableSkip?: boolean;
  disableStop?: boolean;
  disableFullscreen?: boolean;
  disablePlayList?: boolean;
  disableSubtitle?: boolean;
  disableAirplay?: boolean;
};

export type NexenPlayerProps = {
  source: NexenSource;
  config?: NexenConfig;
  playList?: PlayList;
  style?: StyleProp<ViewStyle>;
  theme?: NexenTheme;
  insets?: EdgeInsets;
  onBackPress?: () => void;
  onFullScreenModeUpdate?: (fullScreen: boolean, index?: number) => void;
  onPlay?: (index?: number) => void;
  onPause?: (index?: number) => void;
  onStop?: (index?: number) => void;
  onSkipNext?: (index: number) => void;
  onSkipBack?: (index: number) => void;
  onVolumeUpdate?: (volume: number) => void;
  onBrightnessUpdate?: (brightness: number) => void;
  onMuteUpdate?: (muted: boolean) => void;
  onRepeatUpdate?: (repeat: boolean) => void;
  onSpeedUpdate?: (speed: PlaybackSpeed) => void;
  onPlayListItemSelect?: (index: number) => void;
  onScreenLockUpdate?: (locked: boolean) => void;
  onAirplay?: (source: NexenSource) => void;
  onLoad?: (index?: number) => void;
  onError?: (error: string) => void;
};

const NexenPlayer = React.forwardRef<NexenPlayerRef, NexenPlayerProps>(
  (props, ref) => {
    let {
      source: playerSource,
      config: playerConfig,
      playList: playerPlayList,
      style,
      insets,
      theme,
      onBackPress,
      onFullScreenModeUpdate,
      onPlay,
      onPause,
      onStop,
      onSkipNext,
      onSkipBack,
      onVolumeUpdate,
      onBrightnessUpdate,
      onMuteUpdate,
      onRepeatUpdate,
      onSpeedUpdate,
      onPlayListItemSelect,
      onScreenLockUpdate,
      onAirplay,
      onLoad,
      onError,
    } = props;

    const [dimension, setDimension] = React.useState({ width: 0, height: 0 });
    const [showControl, setShowControl] = React.useState(false);
    const [showSpeedControl, setShowSpeedControl] = React.useState(false);
    const [showTrackControl, setShowTrackControl] = React.useState(false);
    const [showPlaylistControl, setShowPlaylistControl] = React.useState(false);
    const [showMoreControl, setShowMoreControl] = React.useState(false);

    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(false);
    const [locked, setLocked] = React.useState(false);
    const [disablePlaylistAndSkip, setDisablePlaylistAndSkip] =
      React.useState(false);

    const [nexenSource, setNexenSource] =
      React.useState<NexenSource>(playerSource);

    const [nexenConfig, setNexenConfig] = React.useState<
      NexenConfig | undefined
    >({
      loaderText: 'Loading...',
      errorText: 'Error...!',
      doubleTapTime: 300,
      controlTimeout: 5000,
      controlHideMode: 'touch',
      layoutMode: 'intermediate',
      posterResizeMode: 'cover',
      resizeMode: 'contain',

      volume: 80,
      brightness: 25,
      playbackSpeed: '1.0',
      muted: false,
      repeat: false,
      autoPlay: false,

      disableOnScreenPlayButton: false,
      disableBack: false,
      disableResizeMode: false,
      disableMore: false,
      disableSkip: false,
      disableStop: false,
      disableVolume: false,
      disableFullscreen: false,
      disablePlayList: false,
      disableSubtitle: false,
      ...playerConfig,
    });

    const [fullScreen, setFullScreen] = React.useState(false);
    const [paused, setPaused] = React.useState(!nexenConfig?.autoPlay);
    const [trackInfo, setTrackInfo] = React.useState({
      trackTime: 0,
      totalTrackTime: 0,
      cachedTrackTime: 0,
    });

    const [playList, setPlayList] = React.useState<PlayList | undefined>(
      playerPlayList
    );
    const [dropdownTextTracks, setDropdownTextTracks] = React.useState<
      any[] | undefined
    >();

    const [dropdownAudioTracks, setDropdownAudioTracks] = React.useState<
      any[] | undefined
    >();

    const durationTime = React.useRef(0);
    const cachedTime = React.useRef(0);
    const currentTime = React.useRef(0);

    const isSeeking = React.useRef(false);
    const isSliding = React.useRef(false);
    const isSeekable = React.useRef(false);
    const gestureEnabled = React.useRef(false);
    const isStopped = React.useRef(false);
    const isEnded = React.useRef(false);
    const isVolumeSeekable = React.useRef(true);
    const posterDisabled = React.useRef(false);
    const showPoster = React.useRef(true);
    const isFullscreen = React.useRef(fullScreen);
    const appState = React.useRef(AppState.currentState);

    const moreControlRef = React.useRef<WrapperComponentRef>(null);
    const speedControlRef = React.useRef<WrapperComponentRef>(null);
    const playlistControlRef = React.useRef<WrapperComponentRef>(null);
    const trackControlRef = React.useRef<WrapperComponentRef>(null);

    const videoRef = React.useRef<Video>(null);
    const tipViewRef = React.useRef<TipViewRef>(null);
    const headerControlRef = React.useRef<HeaderControlRef>(null);
    const footerControlRef = React.useRef<FooterControlRef>(null);

    const headerOpacity = React.useRef(new Animated.Value(0)).current;
    const headerTopMargin = React.useRef(new Animated.Value(-60)).current;
    const footerOpacity = React.useRef(new Animated.Value(0)).current;
    const footerBottomMargin = React.useRef(new Animated.Value(-60)).current;

    const controlTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    React.useImperativeHandle(ref, () => ({
      play: () => {
        setPaused(false);
      },
      pause: () => {
        setPaused(true);
      },
      stop: () => {
        handleStopPlayback();
      },
      skipNext: () => {
        _onSkipNext();
      },
      skipBack: () => {
        _onSkipBack();
      },
      setFullScreenMode: (fullScreen: boolean) => {
        setFullScreen(fullScreen);
        onFullScreenModeUpdate?.(
          fullScreen,
          nexenConfig?.optimize ? nexenConfig.index : playList?.currentIndex
        );
      },
    }));

    const nexenTheme = React.useMemo((): NexenTheme => {
      return {
        ...DefaultTheme,
        trackSeekBar: {
          ...DefaultTheme.trackSeekBar,
          ...theme?.trackSeekBar,
        },
        speedSeekBar: {
          ...DefaultTheme.speedSeekBar,
          ...theme?.speedSeekBar,
        },
        lineSeekBar: {
          ...DefaultTheme.lineSeekBar,
          ...theme?.lineSeekBar,
        },
        miniSeekBar: {
          ...DefaultMiniSeekBarTheme,
          ...theme?.miniSeekBar,
        },
        volumeSeekBar: {
          ...DefaultTheme.volumeSeekBar,
          ...theme?.volumeSeekBar,
        },
        brightnessSeekBar: {
          ...DefaultTheme.brightnessSeekBar,
          ...theme?.brightnessSeekBar,
        },
        lockButton: {
          ...DefaultTheme.lockButton,
          ...theme?.lockButton,
        },
        tagView: {
          ...DefaultTheme.tagView,
          ...theme?.tagView,
        },
        dropdownMenu: {
          ...DefaultTheme.dropdownMenu,
          ...theme?.dropdownMenu,
        },
        colors: {
          ...DefaultTheme.colors,
          ...theme?.colors,
        },
        sizes: {
          ...DefaultSizesTheme,
          ...theme?.sizes,
        },
        fonts: {
          ...theme?.fonts,
        },
      };
    }, [theme]);

    // const ICON_SIZE_FACTOR = 0.8;
    const TAG_VIEW_ICON_SIZE = nexenTheme?.tagView?.iconSize!;
    const TAG_VIEW_ACTIVE_ICON_COLOR =
      nexenTheme?.tagView?.activeIconColor ||
      getAlphaColor(nexenTheme?.colors?.accentColor!, 0.7);
    const TAG_VIEW_INACTIVE_ICON_COLOR =
      nexenTheme?.tagView?.inactiveIconColor ||
      getAlphaColor(nexenTheme?.colors?.primaryColor!, 0.5);

    const TIP_VIEW_ICON_SIZE = nexenTheme?.tipView?.iconSize;
    const TIP_VIEW_TEXT_SIZE = nexenTheme?.tipView?.textSize;
    const TIP_VIEW_ICON_COLOR =
      nexenTheme.tipView?.iconColor || nexenTheme.colors?.secondaryIconColor;
    const TIP_VIEW_TEXT_COLOR =
      nexenTheme?.tipView?.textColor || nexenTheme?.colors?.secondaryTextColor;

    const CONTAINER_BORDER_RADIUS = nexenTheme?.sizes?.modalCornerRadius;
    const CONTAINER_BACKGROUND_COLOR =
      nexenTheme?.colors?.modalBackgroundColor ||
      getAlphaColor(nexenTheme?.colors?.primaryColor!, 0.7);

    const minValue = Math.min(
      Number(dimension.width),
      Number(dimension.height)
    );
    const MORE_CONTROL_CONTAINER_WIDTH = fullScreen
      ? minValue * 0.55 + insets?.right!
      : minValue * 0.7;
    const SPEED_CONTROL_CONTAINER_HEIGHT = fullScreen
      ? minValue * 0.2 + insets?.bottom!
      : minValue * 0.3;
    const PLAYLIST_CONTROL_CONTAINER_HEIGHT = fullScreen
      ? minValue * 0.3 + insets?.bottom!
      : minValue * 0.35;

    const TRACK_CONTROL_CONTAINER_HEIGHT = fullScreen
      ? minValue * 0.4 + insets?.bottom!
      : minValue * 0.45;

    const LINE_SEEK_BAR_HEIGHT = 2;

    const rtlMultiplier = React.useRef(1);
    const isRTL = I18nManager.isRTL;
    rtlMultiplier.current = isRTL ? -1 : 1;

    const tipViewTheme = React.useMemo((): TipViewTheme => {
      return {
        textColor: TIP_VIEW_TEXT_COLOR,
        textSize: TIP_VIEW_TEXT_SIZE,
        font: nexenTheme?.fonts?.secondaryFont,
      };
    }, [nexenTheme]);

    const loaderTheme = React.useMemo((): TipViewTheme => {
      return {
        iconSize: 40,
        iconColor: TIP_VIEW_ICON_COLOR,
        textColor: TIP_VIEW_TEXT_COLOR,
        textSize: 16,
        font: nexenTheme?.fonts?.secondaryFont,
      };
    }, [nexenTheme]);

    const lineSeekBarTheme = React.useMemo((): LineSeekBarTheme => {
      return {
        lineHeight: LINE_SEEK_BAR_HEIGHT,
        lineColor:
          nexenTheme?.lineSeekBar?.lineColor || nexenTheme?.colors?.accentColor,
        lineUnderlayColor:
          nexenTheme?.lineSeekBar?.lineUnderlayColor ||
          getAlphaColor(nexenTheme?.colors?.secondaryColor!, 0.3),
      };
    }, [nexenTheme]);

    const _onLayoutChange = async (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      const { width: w, height: h } = dimension;
      if (w !== width || h !== height) {
        setDimension({ width, height });
      }
    };

    const _onTapDetected = React.useCallback(
      (event: TapEventType, value?: number) => {
        switch (event) {
          case TapEventType.SINGLE_TAP:
            if (showMoreControl) {
              hideMoreOptions();
              gestureEnabled.current = true;
              break;
            }
            if (showSpeedControl) {
              hidePlaybackSpeedControl();
              gestureEnabled.current = true;
              break;
            }
            if (showTrackControl) {
              hideSubtitleTrackControl();
              gestureEnabled.current = true;
              break;
            }
            if (showPlaylistControl) {
              hideVideoListControl();
              gestureEnabled.current = true;
              break;
            }
            if (showControl) {
              hideMainControl();
            } else {
              showMainControl();
            }
            break;
          case TapEventType.DOUBLE_TAP_LEFT:
          case TapEventType.DOUBLE_TAP_RIGHT:
            if (value) {
              videoRef.current?.seek(value);
              setTrackInfo((prevState) => {
                return {
                  ...prevState,
                  trackTime: value,
                };
              });
            }
            break;
          case TapEventType.DOUBLE_TAP_MIDDLE:
            handleDoubleTapPlayPause();
            break;
        }
      },
      [
        showControl,
        showSpeedControl,
        showTrackControl,
        showPlaylistControl,
        showMoreControl,
        paused,
      ]
    );

    const _onGestureMove = React.useCallback(
      (event: GestureEventType, value: number) => {
        switch (event) {
          case GestureEventType.TRACK:
            videoRef.current?.seek(value);
            setTrackInfo((prevState) => {
              return {
                ...prevState,
                trackTime: value,
              };
            });
            break;
          case GestureEventType.VOLUME:
            headerControlRef.current?.updateIconTagView({
              volumeIcon: getVolumeIcon(
                value,
                MAX_VOLUME,
                TAG_VIEW_ICON_SIZE,
                TIP_VIEW_ICON_COLOR
              ),
            });
            videoRef.current?.setNativeProps({ volume: value / 100 });
            break;
          case GestureEventType.BRIGHTNESS:
            headerControlRef.current?.updateIconTagView({
              brightnessIcon: getBrightnessIcon(
                value,
                MAX_BRIGHTNESS,
                TAG_VIEW_ICON_SIZE,
                TIP_VIEW_ICON_COLOR
              ),
            });
            NexenPlayerModule.setBrightness(value / 100);
            break;
        }
      },
      []
    );

    const _onGestureEnd = React.useCallback(
      async (event: GestureEventType, value: number) => {
        switch (event) {
          case GestureEventType.TRACK:
            videoRef.current?.seek(value);
            setTrackInfo((prevState) => {
              return {
                ...prevState,
                trackTime: value,
              };
            });
            break;
          case GestureEventType.VOLUME:
            headerControlRef.current?.updateIconTagView({
              volumeIcon: getVolumeIcon(
                value,
                MAX_VOLUME,
                TAG_VIEW_ICON_SIZE,
                TIP_VIEW_ICON_COLOR
              ),
            });
            videoRef.current?.setNativeProps({ volume: value / 100 });
            setNexenConfig((prevState) => {
              return {
                ...prevState,
                volume: value,
              };
            });
            onVolumeUpdate?.(value);
            break;
          case GestureEventType.BRIGHTNESS:
            headerControlRef.current?.updateIconTagView({
              brightnessIcon: getBrightnessIcon(
                value,
                MAX_BRIGHTNESS,
                TAG_VIEW_ICON_SIZE,
                TIP_VIEW_ICON_COLOR
              ),
            });
            NexenPlayerModule.setBrightness(value / 100);
            setNexenConfig((prevState) => {
              return {
                ...prevState,
                brightness: value,
              };
            });
            onBrightnessUpdate?.(value);
            break;
        }
      },
      []
    );

    const showMainControl = () => {
      setShowControl(true);
    };

    const hideMainControl = () => {
      startControlHideAnimation(() => {
        setShowControl(false);
      });
    };

    const setControlTimeout = () => {
      controlTimeoutRef.current = setTimeout(() => {
        hideMainControl();
      }, nexenConfig?.controlTimeout);
    };

    const clearControlTimeout = () => {
      if (controlTimeoutRef.current) {
        clearTimeout(controlTimeoutRef.current);
      }
    };

    const resetControlTimeout = () => {
      clearControlTimeout();
      setControlTimeout();
    };

    const showMoreOptions = () => {
      setShowMoreControl(true);
    };

    const hideMoreOptions = () => {
      moreControlRef.current?.hide(() => {
        setShowMoreControl(false);
      });
    };

    const showPlaybackSpeedControl = () => {
      setShowSpeedControl(true);
    };

    const hidePlaybackSpeedControl = () => {
      speedControlRef.current?.hide(() => {
        setShowSpeedControl(false);
      });
    };

    const showSubtitleTrackControl = () => {
      setShowTrackControl(true);
    };

    const hideSubtitleTrackControl = () => {
      trackControlRef.current?.hide(() => {
        setShowTrackControl(false);
      });
    };

    const showVideoListControl = () => {
      setShowPlaylistControl(true);
    };

    const hideVideoListControl = () => {
      playlistControlRef.current?.hide(() => {
        setShowPlaylistControl(false);
      });
    };

    const startControlShowAnimation = (
      callback?: Animated.EndCallback | undefined
    ) => {
      Animated.parallel([
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(headerTopMargin, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(footerOpacity, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(footerBottomMargin, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]).start(callback);
    };

    const startControlHideAnimation = (
      callback?: Animated.EndCallback | undefined
    ) => {
      Animated.parallel([
        Animated.timing(headerOpacity, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(headerTopMargin, {
          toValue: -60,
          duration: ANIMATION_DURATION,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(footerOpacity, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(footerBottomMargin, {
          toValue: -60,
          duration: ANIMATION_DURATION,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]).start(callback);
    };

    React.useEffect(() => {
      if (paused) {
        if (isStopped.current) {
          videoRef.current?.seek(0, 0);
          onStop?.(
            nexenConfig?.optimize ? nexenConfig.index : playList?.currentIndex
          );
        }
        onPause?.(
          nexenConfig?.optimize ? nexenConfig.index : playList?.currentIndex
        );
      } else {
        isStopped.current = false;
        onPlay?.(
          nexenConfig?.optimize ? nexenConfig.index : playList?.currentIndex
        );
      }
    }, [paused]);

    React.useEffect(() => {
      isFullscreen.current = fullScreen;

      if (showControl) {
        startControlShowAnimation();
        if (nexenConfig?.controlHideMode == 'auto') {
          setControlTimeout();
        }
      } else {
        if (nexenConfig?.controlHideMode == 'auto') {
          clearControlTimeout();
        }
      }

      if (nexenConfig?.layoutMode === 'advanced') {
        headerControlRef.current?.updateIconTagView({
          volumeIcon: getVolumeIcon(
            nexenConfig?.volume!,
            MAX_VOLUME,
            TAG_VIEW_ICON_SIZE,
            TIP_VIEW_ICON_COLOR
          ),
          brightnessIcon: getBrightnessIcon(
            nexenConfig?.brightness!,
            MAX_BRIGHTNESS,
            TAG_VIEW_ICON_SIZE,
            TIP_VIEW_ICON_COLOR
          ),
          repeatIcon: nexenConfig?.repeat ? (
            <IconRepeat
              size={TAG_VIEW_ICON_SIZE}
              color={TAG_VIEW_ACTIVE_ICON_COLOR}
            />
          ) : (
            <IconRepeat
              size={TAG_VIEW_ICON_SIZE}
              color={TAG_VIEW_INACTIVE_ICON_COLOR}
            />
          ),
          speedIcon:
            nexenConfig?.playbackSpeed !== '1.0' ? (
              <IconZap
                size={TAG_VIEW_ICON_SIZE}
                color={TAG_VIEW_ACTIVE_ICON_COLOR}
              />
            ) : (
              <IconZap
                size={TAG_VIEW_ICON_SIZE}
                color={TAG_VIEW_INACTIVE_ICON_COLOR}
              />
            ),
        });
      }
    }, [showControl, fullScreen, locked, nexenConfig]);

    React.useEffect(() => {
      if (showMoreControl) {
        moreControlRef.current?.show();
        return;
      }

      if (showSpeedControl) {
        speedControlRef.current?.show();
        return;
      }

      if (showTrackControl) {
        trackControlRef.current?.show();
        return;
      }
      if (showPlaylistControl) {
        playlistControlRef.current?.show();
        return;
      }
    }, [
      showMoreControl,
      showSpeedControl,
      showTrackControl,
      showPlaylistControl,
    ]);

    React.useEffect(() => {
      currentTime.current = trackInfo.trackTime;
      cachedTime.current = trackInfo.cachedTrackTime;
      durationTime.current = trackInfo.totalTrackTime;
    }, [trackInfo]);

    React.useEffect(() => {
      const currentIndex = RESIZE_MODE_VALUES.indexOf(nexenConfig?.resizeMode);
      if (isSeekable.current) {
        tipViewRef.current?.updateState({
          showTip: true,
          tipText: getAspectRatioTipText(RESIZE_MODES[currentIndex]),
          autoHide: true,
        });
      }
    }, [nexenConfig?.resizeMode]);

    React.useEffect(() => {
      const newConfig = {
        ...nexenConfig,
        ...playerConfig,
      };
      NexenPlayerModule.setBrightness(newConfig.brightness! / 100);
      setNexenConfig(newConfig);
      if (newConfig?.optimize) {
        if (newConfig?.index != newConfig?.activeIndex) {
          showPoster.current = true;
          setPaused(true);
          hideMainControl();
        } else {
          setPlayList((prevState) => {
            return {
              ...prevState,
              currentIndex: newConfig?.activeIndex!,
            };
          });
        }
      }
    }, [playerConfig]);

    React.useEffect(() => {
      const newSource = {
        ...nexenSource,
        ...playerSource,
      };
      if (newSource.poster) {
        showPoster.current = true;
      } else {
        showPoster.current = false;
      }
      setNexenSource(newSource);
    }, [playerSource]);

    React.useEffect(() => {
      if (
        !playerPlayList ||
        !playerPlayList.items ||
        playerPlayList.items.length === 0
      ) {
        setDisablePlaylistAndSkip(true);
      } else {
        setDisablePlaylistAndSkip(false);
      }

      setPlayList((prevState) => {
        return {
          ...prevState,
          ...playerPlayList,
        };
      });
    }, [playerPlayList]);

    React.useEffect(() => {
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        _onBackPress
      );
      const subscription = AppState.addEventListener(
        'change',
        (nextAppState) => {
          if (
            appState.current.match(/inactive|background/) &&
            nextAppState === 'active'
          ) {
            if (isFullscreen.current) {
              NexenPlayerModule.hideSystemBar();
            }
          }
          appState.current = nextAppState;
        }
      );
      return () => {
        backHandler.remove();
        subscription.remove();
        if (controlTimeoutRef.current) {
          clearTimeout(controlTimeoutRef.current);
        }
      };
    }, []);

    const _onBackPress = React.useCallback(() => {
      if (isFullscreen.current) {
        setFullScreen(false);
        NexenPlayerModule.showSystemBar();
        onFullScreenModeUpdate?.(
          false,
          nexenConfig?.optimize ? nexenConfig.index : playList?.currentIndex
        );
      } else {
        onBackPress?.();
      }
      return true;
    }, []);

    const _onAspectRatioPress = React.useCallback(() => {
      handleResizeMode(nexenConfig?.resizeMode);
    }, [nexenConfig?.resizeMode]);

    const _onMorePress = React.useCallback(() => {
      showMoreOptions();
      hideMainControl();
      gestureEnabled.current = false;
    }, []);

    const _onMoreItemPress = React.useCallback(
      (item: MoreItem) => {
        switch (item.id) {
          case 'lock':
            hideMoreOptions();
            handleLockScreen();
            isSeekable.current = false;
            gestureEnabled.current = false;
            break;
          case 'speed':
            hideMoreOptions();
            showPlaybackSpeedControl();
            gestureEnabled.current = false;
            break;
          case 'repeat':
            hideMoreOptions();
            handleRepeatVideo(!nexenConfig?.repeat);
            gestureEnabled.current = true;
            break;
        }
      },
      [nexenConfig]
    );

    const _onSpeedUpdate = React.useCallback((value: string) => {
      const newSpeed = value as PlaybackSpeed;
      tipViewRef.current?.updateState({
        showTip: true,
        tipText: `${newSpeed}x 倍速`,
        autoHide: true,
        withIcon: true,
        icon: <IconZap size={TIP_VIEW_ICON_SIZE} color={TIP_VIEW_ICON_COLOR} />,
      });
      setNexenConfig((prevState) => {
        return {
          ...prevState,
          playbackSpeed: newSpeed,
        };
      });
      onSpeedUpdate?.(newSpeed);
    }, []);

    const _onTextTrackSelect = React.useCallback(
      (selectedTextTrack: SelectedTextTrack) => {
        setNexenSource((prevState) => {
          return {
            ...prevState,
            selectedTextTrack,
          };
        });
      },
      []
    );

    const _onAudioTrackSelect = React.useCallback(
      (selectedAudioTrack: SelectedAudioTrack) => {
        setNexenSource((prevState) => {
          return {
            ...prevState,
            selectedAudioTrack,
          };
        });
      },
      []
    );

    const handleDoubleTapPlayPause = () => {
      if (paused) {
        setPaused(false);
        tipViewRef.current?.updateState({
          showTip: true,
          tipText: '播放',
          autoHide: true,
          withIcon: true,
          icon: (
            <IconPaly size={TIP_VIEW_ICON_SIZE} color={TIP_VIEW_ICON_COLOR} />
          ),
        });
      } else {
        setPaused(true);
        tipViewRef.current?.updateState({
          showTip: true,
          tipText: '暂停',
          autoHide: true,
          withIcon: true,
          icon: (
            <IconPause size={TIP_VIEW_ICON_SIZE} color={TIP_VIEW_ICON_COLOR} />
          ),
        });
      }
    };

    /* FooterControl Callback */
    const _onPlayPress = () => {
      setPaused(false);
    };

    const _onCcPress = () => {
      hideMainControl();
      showSubtitleTrackControl();
      gestureEnabled.current = false;
    };

    const _onAirplayPress = () => {
      onAirplay?.(newSource);
    }

    const _onStopPress = () => {
      handleStopPlayback();
    };

    const handleStopPlayback = () => {
      isStopped.current = true;
      if (paused) {
        videoRef.current?.seek(0, 0);
        onStop?.(
          nexenConfig?.optimize ? nexenConfig.index : playList?.currentIndex
        );
      } else {
        if (isEnded.current && nexenConfig?.repeat) {
          setPaused(false);
          videoRef.current?.seek(0, 0);
          onStop?.(
            nexenConfig?.optimize ? nexenConfig.index : playList?.currentIndex
          );
        } else {
          setPaused(true);
        }
      }
    };

    const handleRepeatVideo = (repeat: boolean) => {
      tipViewRef.current?.updateState({
        showTip: true,
        tipText: repeat ? '开启重复' : '关闭重复',
        autoHide: true,
        withIcon: true,
        icon: (
          <IconRepeat size={TIP_VIEW_ICON_SIZE} color={TIP_VIEW_ICON_COLOR} />
        ),
      });
      setNexenConfig((prevState) => {
        return {
          ...prevState,
          repeat: repeat,
        };
      });
      onRepeatUpdate?.(repeat);
    };

    const handleResizeMode = (resizeMode: ResizeMode) => {
      const currentIndex = RESIZE_MODE_VALUES.indexOf(resizeMode);
      if (currentIndex < RESIZE_MODE_VALUES.length - 1) {
        setNexenConfig((prevState) => {
          return {
            ...prevState,
            resizeMode: RESIZE_MODE_VALUES[currentIndex + 1],
          };
        });
      } else {
        setNexenConfig((prevState) => {
          return {
            ...prevState,
            resizeMode: RESIZE_MODE_VALUES[0],
          };
        });
      }
    };

    const handleLockScreen = () => {
      tipViewRef.current?.updateState({
        showTip: true,
        tipText: '加锁',
        autoHide: true,
        withIcon: true,
        icon: (
          <IconLock size={TIP_VIEW_ICON_SIZE} color={TIP_VIEW_ICON_COLOR} />
        ),
      });
      setLocked(true);
      onScreenLockUpdate?.(true);
    };

    const handleTextTracks = (textTracks?: any[]) => {
      const selectedTrack = textTracks?.find((x: any) => {
        return x?.selected;
      });

      setDropdownTextTracks(textTracks);
      if (selectedTrack?.language) {
        setNexenSource((prevState) => {
          return {
            ...prevState,
            selectedTextTrack: {
              type: 'language',
              value: selectedTrack?.language,
            },
          };
        });
      }
    };

    const handleAudioTracks = (audioTracks: any[]) => {
      const selectedTrack = audioTracks?.find((x: any) => {
        return x?.selected;
      });
      setDropdownAudioTracks(audioTracks);
      if (selectedTrack?.language) {
        setNexenSource((prevState) => {
          return {
            ...prevState,
            selectedAudioTrack: {
              type: 'language',
              value: selectedTrack?.language,
            },
          };
        });
      }
    };

    const _onRewind = () => {
      const time = trackInfo.trackTime - FORWARD_OR_REWIND_DURATION;
      videoRef.current?.seek(time);
      setTrackInfo((prevState) => {
        return {
          ...prevState,
          trackTime: time,
        };
      });
    };

    const _onFastForward = () => {
      const time = trackInfo.trackTime + FORWARD_OR_REWIND_DURATION;
      videoRef.current?.seek(time);
      setTrackInfo((prevState) => {
        return {
          ...prevState,
          trackTime: time,
        };
      });
    };

    const _onSkipNext = () => {
      if (playList) {
        if (playList.currentIndex! < playList.items?.length! - 1) {
          const index = playList.currentIndex! + 1;
          setPlayList((prevState) => {
            return {
              ...prevState,
              currentIndex: index,
            };
          });
          onSkipNext?.(index);
        }
      }
    };

    const _onSkipBack = () => {
      if (playList) {
        if (playList.currentIndex! > 0) {
          const index = playList.currentIndex! - 1;
          setPlayList((prevState) => {
            return {
              ...prevState,
              currentIndex: index,
            };
          });
          onSkipBack?.(index);
        }
      }
    };
    const _onVideoListPress = () => {
      hideMainControl();
      showVideoListControl();
      gestureEnabled.current = false;
    };

    const _onPlaylistItemPress = (index: number) => {
      setPlayList((prevState) => {
        return {
          ...prevState,
          currentIndex: index,
        };
      });
      onPlayListItemSelect?.(index);
    };

    const _onTogglePlayPause = () => {
      setPaused((prevState) => !prevState);
    };

    const _onToggleFullScreen = () => {
      if (fullScreen) {
        NexenPlayerModule.showSystemBar();
      } else {
        NexenPlayerModule.hideSystemBar();
      }
      onFullScreenModeUpdate?.(
        !fullScreen,
        nexenConfig?.optimize ? nexenConfig.index : playList?.currentIndex
      );
      setFullScreen((prevState) => !prevState);
    };

    const _onToggleVolume = () => {
      handleMuteVideo(!nexenConfig?.muted);
    };

    const handleMuteVideo = (mute: boolean) => {
      tipViewRef.current?.updateState({
        showTip: true,
        tipText: mute ? '禁音' : '打开声音',
        autoHide: true,
      });
      isVolumeSeekable.current = !mute;
      onMuteUpdate?.(mute);
      setNexenConfig((prevState) => {
        return {
          ...prevState,
          muted: mute,
        };
      });
    };

    /* Slide Button Callback */
    const _onSlideStart = React.useCallback(() => {
      isSliding.current = true;
    }, []);

    const _onSlideEnd = React.useCallback(() => {
      isSliding.current = false;
    }, []);

    const _onReachedToStart = React.useCallback(() => {}, []);

    const _onReachedToEnd = React.useCallback(() => {
      setLocked(false);
      isSeekable.current = true;
      gestureEnabled.current = true;
      tipViewRef.current?.updateState({
        showTip: true,
        tipText: '解锁',
        autoHide: true,
        withIcon: true,
        icon: (
          <IconUnlock size={TIP_VIEW_ICON_SIZE} color={TIP_VIEW_ICON_COLOR} />
        ),
      });
    }, []);

    /* SeekBar Callback */
    const _onSeekStart = React.useCallback(
      (value: number, totalValue: number) => {
        isSeeking.current = true;
        tipViewRef.current?.updateState({
          showTip: true,
          tipText: getTimeTipText(value, totalValue),
          autoHide: false,
        });
      },
      []
    );

    const _onSeekUpdate = React.useCallback(
      (value: number, totalValue: number) => {
        if (isSeeking.current) {
          tipViewRef.current?.updateState({
            tipText: getTimeTipText(value, totalValue),
          });
        }
      },
      []
    );

    const _onSeekEnd = React.useCallback((value: number) => {
      isSeeking.current = false;
      videoRef.current?.seek(value);
      setTrackInfo((prevState) => {
        return { ...prevState, trackTime: value };
      });

      tipViewRef.current?.updateState({ showTip: false, autoHide: true });
    }, []);

    /* Volume SeekBar Callback */
    const _onVolumeSeekStart = React.useCallback(
      (value: number, totalValue: number) => {
        videoRef.current?.setNativeProps({ volume: value / 100 });
        tipViewRef.current?.updateState({
          showTip: true,
          tipText: `音量 : ${value}%`,
          autoHide: false,
        });
        onVolumeUpdate?.(value);
      },
      []
    );

    const _onVolumeSeekUpdate = React.useCallback(
      (value: number, totalValue: number) => {
        videoRef.current?.setNativeProps({ volume: value / 100 });
        tipViewRef.current?.updateState({
          showTip: true,
          tipText: `音量 : ${value}%`,
          autoHide: false,
        });
        onVolumeUpdate?.(value);
      },
      []
    );

    const _onVolumeSeekEnd = React.useCallback((value: number) => {
      setNexenConfig((prevState) => {
        return {
          ...prevState,
          volume: value,
        };
      });
      videoRef.current?.setNativeProps({ volume: value / 100 });
      tipViewRef.current?.updateState({ showTip: false, autoHide: true });
      onVolumeUpdate?.(value);
    }, []);

    /* Video Callback */
    const _onLoadStart = React.useCallback(() => {
      setLoading(true);
      showPoster.current = true;
    }, []);
    const _onLoad = React.useCallback((data: OnLoadData) => {
      setLoading(false);
      setError(false);
      onLoad?.(
        nexenConfig?.optimize ? nexenConfig.index : playList?.currentIndex
      );
      if (nexenConfig?.autoPlay) {
        setPaused(false);
      }
      setTrackInfo((prevState) => {
        return {
          ...prevState,
          trackTime: data.currentTime,
          totalTrackTime: data.duration,
        };
      });
      handleTextTracks(data.textTracks);
      handleAudioTracks(data.audioTracks);
      isSeekable.current = true;
      gestureEnabled.current = true;
      isStopped.current = false;
    }, []);

    const _onProgress = React.useCallback(
      (data: OnProgressData) => {
        if (showPoster) {
          showPoster.current = false;
        }
        if (!isSeeking.current) {
          setTrackInfo({
            trackTime: data.currentTime,
            cachedTrackTime: data.playableDuration,
            totalTrackTime: data.seekableDuration,
          });
        }
      },
      [showPoster]
    );

    const _onSeek = React.useCallback((data: OnSeekData) => {
      if (isStopped.current && data.seekTime == 0 && data.currentTime == 0) {
        setTrackInfo((prevState) => {
          return {
            ...prevState,
            trackTime: 0,
            cachedTrackTime: 0,
          };
        });
        isEnded.current = false;
        isStopped.current = false;
      }
    }, []);

    const _onEnd = React.useCallback(() => {
      isEnded.current = true;
      handleStopPlayback();
    }, [paused, nexenConfig]);

    const _onError = React.useCallback((error: LoadError) => {
      setError(true);
      onError?.(error.error.errorString);
    }, []);

    const newSource: NexenSource = playList?.items
      ? playList?.items.length !== 0
        ? playList?.items[playList.currentIndex!].itemSource
        : nexenSource
      : nexenSource;

    if (newSource.poster) {
      posterDisabled.current = false;
    } else {
      posterDisabled.current = true;
    }

    const newStyle: StyleProp<ViewStyle> = fullScreen
      ? {
          position: 'absolute',
          width: '100%',
          height: '100%',
          top: 0,
          left: 0,
          zIndex: 9999,
        }
      : { position: 'relative' };

    return (
      <View
        style={[styles.playerContainer, style, newStyle]}
        onLayout={_onLayoutChange}
      >
        {nexenConfig?.optimize ? (
          nexenConfig?.index === nexenConfig?.activeIndex ? (
            <Video
              ref={videoRef}
              style={styles.player}
              source={newSource.source}
              textTracks={newSource.textTracks}
              selectedTextTrack={newSource.selectedTextTrack}
              selectedAudioTrack={newSource.selectedAudioTrack}
              paused={paused}
              resizeMode={nexenConfig?.resizeMode}
              muted={nexenConfig?.muted}
              volume={nexenConfig?.volume! / 100}
              repeat={nexenConfig?.repeat}
              rate={Number(nexenConfig?.playbackSpeed)}
              progressUpdateInterval={1000}
              onLoadStart={_onLoadStart}
              onLoad={_onLoad}
              onProgress={_onProgress}
              onSeek={_onSeek}
              onEnd={_onEnd}
              onError={_onError}
              // minLoadRetryCount={1000}
              // mixWithOthers="duck"
              // ignoreSilentSwitch="ignore"
              pictureInPicture={true}
              playInBackground={true}
              allowsExternalPlayback={true}
              // disableFocus={true}
              playWhenInactive={true} 
            />
          ) : null
        ) : (
          <Video
            ref={videoRef}
            style={styles.player}
            source={newSource.source}
            textTracks={newSource.textTracks}
            selectedTextTrack={newSource.selectedTextTrack}
            selectedAudioTrack={newSource.selectedAudioTrack}
            paused={paused}
            resizeMode={nexenConfig?.resizeMode}
            muted={nexenConfig?.muted}
            volume={nexenConfig?.volume! / 100}
            repeat={nexenConfig?.repeat}
            rate={Number(nexenConfig?.playbackSpeed)}
            progressUpdateInterval={1000}
            onLoadStart={_onLoadStart}
            onLoad={_onLoad}
            onProgress={_onProgress}
            onSeek={_onSeek}
            onEnd={_onEnd}
            onError={_onError}
            minLoadRetryCount={1000}
            mixWithOthers="duck"
            ignoreSilentSwitch="ignore"
            pictureInPicture={true}
            playInBackground={true}
            allowsExternalPlayback={true}
            disableFocus={true}
            playWhenInactive={true} 
          />
        )}

        {!posterDisabled.current && showPoster.current && !error && (
          <PosterView
            posterSource={newSource.poster}
            posterResizeMode={nexenConfig?.posterResizeMode}
          />
        )}

        <GestureView
          fullScreen={fullScreen}
          locked={locked}
          error={error}
          isSeeking={isSeeking}
          isSliding={isSliding}
          isSeekable={isSeekable}
          gestureEnabled={gestureEnabled}
          durationTime={durationTime}
          currentTime={currentTime}
          dimension={dimension}
          playerConfig={nexenConfig}
          nexenTheme={nexenTheme}
          onTapDetected={_onTapDetected}
          onGestureMove={_onGestureMove}
          onGestureEnd={_onGestureEnd}
        />

        <>
          {/* top control bar */}
          {showControl && (
            <HeaderControl
              ref={headerControlRef}
              title={newSource.title}
              opacity={headerOpacity}
              marginTop={headerTopMargin}
              fullScreen={fullScreen}
              locked={locked}
              insets={insets}
              playerConfig={nexenConfig}
              nexenTheme={nexenTheme}
              onBackPress={_onBackPress}
              onAspectRatioPress={_onAspectRatioPress}
              onMorePress={_onMorePress}
            />
          )}

          {/* bottom control bar */}
          {showControl && (
            <FooterControl
              ref={footerControlRef}
              opacity={footerOpacity}
              marginBottom={footerBottomMargin}
              fullScreen={fullScreen}
              locked={locked}
              insets={insets}
              playerConfig={nexenConfig}
              nexenTheme={nexenTheme}
              paused={paused!}
              isSeekable={isSeekable}
              isVolumeSeekable={isVolumeSeekable}
              trackTime={trackInfo.trackTime}
              cachedTrackTime={trackInfo.cachedTrackTime}
              totalTrackTime={trackInfo.totalTrackTime}
              totalVolume={MAX_VOLUME}
              disablePlaylistAndSkip={disablePlaylistAndSkip}
              onStopPress={_onStopPress}
              onPlayPress={_onTogglePlayPause}
              onFullScreenPress={_onToggleFullScreen}
              onVolumePress={_onToggleVolume}
              onCcPress={_onCcPress}
              onAirplayPress={_onAirplayPress}
              onVideoListPress={_onVideoListPress}
              onAspectRatioPress={_onAspectRatioPress}
              onRewind={_onRewind}
              onFastForward={_onFastForward}
              onSeekStart={_onSeekStart}
              onSkipNext={_onSkipNext}
              onSkipBack={_onSkipBack}
              onSeekUpdate={_onSeekUpdate}
              onSeekEnd={_onSeekEnd}
              onVolumeSeekStart={_onVolumeSeekStart}
              onVolumeSeekUpdate={_onVolumeSeekUpdate}
              onVolumeSeekEnd={_onVolumeSeekEnd}
              onSlideStart={_onSlideStart}
              onSlideEnd={_onSlideEnd}
              onReachedToStart={_onReachedToStart}
              onReachedToEnd={_onReachedToEnd}
            />
          )}
          {/* bottom line bar */}
          {!showControl &&
            !showMoreControl &&
            !showSpeedControl &&
            !showTrackControl && (
              <LineSeekBar
                trackTime={trackInfo.trackTime}
                totalTrackTime={trackInfo.totalTrackTime}
                layoutWidth={dimension.width}
                theme={lineSeekBarTheme}
              />
            )}

          {showMoreControl && (
            <MoreControl
              ref={moreControlRef}
              animateFrom={'RIGHT'}
              distance={MORE_CONTROL_CONTAINER_WIDTH}
              style={{
                width: MORE_CONTROL_CONTAINER_WIDTH,
                backgroundColor: CONTAINER_BACKGROUND_COLOR,
                borderTopLeftRadius: CONTAINER_BORDER_RADIUS,
                borderBottomLeftRadius: CONTAINER_BORDER_RADIUS,
              }}
              fullScreen={fullScreen}
              insets={insets}
              nexenTheme={nexenTheme}
              onItemPress={_onMoreItemPress}
            />
          )}

          {showSpeedControl && (
            <SpeedControl
              ref={speedControlRef}
              animateFrom={'BOTTOM'}
              distance={SPEED_CONTROL_CONTAINER_HEIGHT}
              style={{
                height: SPEED_CONTROL_CONTAINER_HEIGHT,
                backgroundColor: CONTAINER_BACKGROUND_COLOR,
                borderTopLeftRadius: CONTAINER_BORDER_RADIUS,
                borderTopRightRadius: CONTAINER_BORDER_RADIUS,
              }}
              fullScreen={fullScreen}
              insets={insets}
              currentSpeed={nexenConfig?.playbackSpeed!}
              nexenTheme={nexenTheme}
              onSpeedChange={_onSpeedUpdate}
            />
          )}

          {showTrackControl && (
            <TrackControl
              ref={trackControlRef}
              animateFrom={'BOTTOM'}
              distance={TRACK_CONTROL_CONTAINER_HEIGHT}
              style={{
                height: TRACK_CONTROL_CONTAINER_HEIGHT,
                backgroundColor: CONTAINER_BACKGROUND_COLOR,
                borderTopLeftRadius: CONTAINER_BORDER_RADIUS,
                borderTopRightRadius: CONTAINER_BORDER_RADIUS,
              }}
              textTracks={dropdownTextTracks}
              selectedTextTrack={nexenSource.selectedTextTrack}
              onTextTrackSelect={_onTextTrackSelect}
              audioTracks={dropdownAudioTracks}
              selectedAudioTrack={nexenSource.selectedAudioTrack}
              onAudioTrackSelect={_onAudioTrackSelect}
              fullScreen={fullScreen}
              insets={insets}
              nexenTheme={nexenTheme}
            />
          )}

          {showPlaylistControl && (
            <PlaylistControl
              ref={playlistControlRef}
              animateFrom={'BOTTOM'}
              distance={PLAYLIST_CONTROL_CONTAINER_HEIGHT}
              style={{
                height: PLAYLIST_CONTROL_CONTAINER_HEIGHT,
                backgroundColor: CONTAINER_BACKGROUND_COLOR,
                borderTopLeftRadius: CONTAINER_BORDER_RADIUS,
                borderTopRightRadius: CONTAINER_BORDER_RADIUS,
              }}
              playlist={playList?.items}
              playlistIndex={playList?.currentIndex}
              fullScreen={fullScreen}
              nexenTheme={nexenTheme}
              onPlayListItemPress={_onPlaylistItemPress}
            />
          )}

          {paused &&
            !showControl &&
            !showMoreControl &&
            !showSpeedControl &&
            !showTrackControl &&
            !showPlaylistControl &&
            !locked &&
            !loading &&
            !error &&
            !nexenConfig?.disableOnScreenPlayButton && (
              <PlayButton dimension={dimension} onPlayPress={_onPlayPress} />
            )}

          {/* Loader */}
          {!error && loading && (
            <Loader
              style={{
                backgroundColor: CONTAINER_BACKGROUND_COLOR,
                borderRadius: CONTAINER_BORDER_RADIUS,
              }}
              theme={loaderTheme}
              loaderText={nexenConfig?.loaderText}
            />
          )}

          {nexenConfig?.layoutMode !== 'basic' && (
            <TipView
              ref={tipViewRef}
              style={{
                backgroundColor: CONTAINER_BACKGROUND_COLOR,
                borderRadius: CONTAINER_BORDER_RADIUS,
              }}
              theme={tipViewTheme}
            />
          )}
        </>
      </View>
    );
  }
);

export default NexenPlayer;

NexenPlayer.defaultProps = {
  playList: {
    items: [],
    currentIndex: 0,
  },
  insets: {
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
};

const styles = StyleSheet.create({
  playerContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  player: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0a0a0a',
  },
});
