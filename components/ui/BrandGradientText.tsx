import { StyleSheet, Text, TextStyle, ViewStyle } from "react-native"
import MaskedView from "@react-native-masked-view/masked-view"
import { LinearGradient } from "expo-linear-gradient"

type Props = {
  text?: string
  style?: TextStyle
  containerStyle?: ViewStyle
}

export function BrandGradientText({ text = "VIVOS", style, containerStyle }: Props) {
  return (
    <MaskedView
      style={[styles.mask, containerStyle]}
      maskElement={<Text style={[styles.text, style]}>{text}</Text>}
    >
      <LinearGradient
        colors={["#53D7FF", "#8C7CFF", "#D869B6", "#FFD166"]}
        locations={[0, 0.34, 0.68, 1]}
        start={{ x: 0, y: 0.15 }}
        end={{ x: 1, y: 0.9 }}
      >
        <Text style={[styles.text, style, styles.hidden]}>{text}</Text>
      </LinearGradient>
    </MaskedView>
  )
}

const styles = StyleSheet.create({
  mask: {
    alignSelf: "flex-start",
  },
  text: {
    color: "white",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
  hidden: {
    opacity: 0,
  },
})
