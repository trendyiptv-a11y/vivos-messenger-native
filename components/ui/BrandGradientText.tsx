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
        colors={["#63A6E6", "#9B7CFF", "#C96AA1", "#F5D78E"]}
        start={{ x: 0, y: 0.2 }}
        end={{ x: 1, y: 0.8 }}
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
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  hidden: {
    opacity: 0,
  },
})
